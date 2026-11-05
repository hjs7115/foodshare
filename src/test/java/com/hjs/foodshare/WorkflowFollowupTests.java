package com.hjs.foodshare;

import com.hjs.foodshare.user.domain.*;
import com.hjs.foodshare.user.repository.*;
import com.hjs.foodshare.post.domain.*;
import com.hjs.foodshare.post.repository.*;
import com.hjs.foodshare.trade.domain.*;
import com.hjs.foodshare.trade.service.*;
import com.hjs.foodshare.trade.repository.*;
import com.hjs.foodshare.chat.service.*;
import com.hjs.foodshare.moderation.service.*;
import com.hjs.foodshare.moderation.domain.*;
import com.hjs.foodshare.moderation.dto.*;
import com.hjs.foodshare.fridge.open.*;
import com.hjs.foodshare.fridge.domain.*;
import com.hjs.foodshare.fridge.repository.*;
import com.hjs.foodshare.notification.service.*;
import com.hjs.foodshare.notification.domain.*;
import com.hjs.foodshare.notification.repository.*;
import com.hjs.foodshare.global.exception.*;
import jakarta.persistence.*;
import java.time.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Regression coverage for post-cancellation and moderation workflows. */
@SpringBootTest @Transactional
class WorkflowFollowupTests {
 @Autowired UserRepository users;
 @Autowired PostRepository posts;
 @Autowired TradeRequestService trades;
 @Autowired TradeRequestRepository requests;
 @Autowired ChatService chats;
 @Autowired ModerationService moderation;
 @Autowired OpenFridgeService open;
 @Autowired FridgeItemRepository fridge;
 @Autowired NotificationRepository notes;
 @Autowired PushRetryService pushJobs;
 @MockitoBean FcmPushService fcm;
 @PersistenceContext EntityManager em;
 User user(String n){var u=users.save(User.create(n,n,n+"@audit.local","unused",String.format("010%08d",Math.abs(n.hashCode()%100000000)),"서울 강남구 역삼동"));u.updateLocation("서울 강남구 역삼동",37.50123,127.01234);return u;}
 Post post(User u,PostType type){return posts.save(Post.create(u,type,"두부","두부","1개",1000,"서울 강남구 역삼동",0.0,LocalDate.now().plusDays(3),37.50123,127.01234,null,"조건",type==PostType.GROUP_BUY?1:null,type==PostType.GROUP_BUY?2:null,type==PostType.GROUP_BUY?LocalDateTime.now().plusDays(1):null));}
 FridgeItem item(User u){return fridge.save(FridgeItem.create(u,"두부","1개",LocalDate.now().plusDays(3),"냉장",""));}
 @Test void cancelledFridgeRequestAllowsRetryInListAndApi(){
  var owner=user("owner");var buyer=user("buyer");var f=item(owner);open.publish(owner.getId(),f.getId(),"1개");
  var first=open.request(buyer.getId(),f.getId());trades.cancelMarketTrade(first.requestId(),buyer.getId(),"기타");
  var visible=open.nearby(buyer.getId(),"").neighbors().getFirst().items().getFirst();
  assertFalse(visible.requested());
  assertEquals(TradeRequestStatus.PENDING,open.request(buyer.getId(),f.getId()).status());
 }
 @Test void blockedChatStillAllowsHistoricalMessageReport(){
  var owner=user("owner");var buyer=user("buyer");var p=post(owner,PostType.SALE);
  var request=trades.createRequest(p.getId(),buyer.getId());var accepted=trades.accept(request.requestId(),owner.getId());
  var message=chats.sendMessage(owner.getId(),accepted.chatRoomId(),"신고할 메시지");
  moderation.blockUser(buyer.getId(),owner.getId());
  var report=moderation.createReport(buyer.getId(),new ReportCreateRequest(ReportTargetType.CHAT_MESSAGE,message.messageId(),"욕설",null));
  assertTrue(report.evidence().contains("신고할 메시지"));
  assertEquals(message.messageId(),chats.reportableMessages(buyer.getId(),request.requestId(),null).getFirst().messageId());
  assertFalse(chats.canAccessRoom(buyer.getId(),accepted.chatRoomId()));
 }
 @Test void acceptedFridgePhotoIsPreservedInExistingTrade_negativeControl(){
  var owner=user("owner");var buyer=user("buyer");var f=item(owner);f.setImageUrl("/uploads/old-evidence.jpg");
  var shared=open.publish(owner.getId(),f.getId(),"1개");var request=open.request(buyer.getId(),f.getId());trades.accept(request.requestId(),owner.getId());
  open.photo(owner.getId(),f.getId(),null);
  assertEquals("/uploads/old-evidence.jpg",posts.findById(shared.postId()).orElseThrow().getImageUrl());
  assertEquals(TradeRequestStatus.ACCEPTED,requests.findById(request.requestId()).orElseThrow().getStatus());
 }
 @Test void messageAuthorCannotPreventReportByBlockingRecipient(){
  var author=user("author");var recipient=user("recipient");var p=post(author,PostType.SALE);
  var request=trades.createRequest(p.getId(),recipient.getId());var accepted=trades.accept(request.requestId(),author.getId());
  var message=chats.sendMessage(author.getId(),accepted.chatRoomId(),"신고 대상 메시지");
  moderation.blockUser(author.getId(),recipient.getId());
  var report=moderation.createReport(recipient.getId(),new ReportCreateRequest(ReportTargetType.CHAT_MESSAGE,message.messageId(),"욕설",null));
  assertTrue(report.evidence().contains("신고 대상 메시지"));
 }
 @Test void disabledAcceptanceSettingAlsoSuppressesRoomOpeningPush(){
  var owner=user("owner");var buyer=user("buyer");buyer.updateNotificationSettings(false,false,false,false,false);
  em.persist(UserFcmToken.create(buyer,"audit-fake-device-token"));
  var p=post(owner,PostType.SALE);var request=trades.createRequest(p.getId(),buyer.getId());trades.accept(request.requestId(),owner.getId());
  em.flush();var jobs=em.createQuery("select p.id from PushRetry p where p.userId=:id and p.type='CHAT_ROOM_OPENED'",Long.class).setParameter("id",buyer.getId()).getResultList();
  assertEquals(1,jobs.size());
  when(fcm.sendPush(anyString(),anyString(),anyString(),anyMap())).thenReturn(FcmPushService.SendResult.SENT);
  pushJobs.deliver(jobs.getFirst());
  verify(fcm,never()).sendPush(anyString(),anyString(),anyString(),anyMap());
 }
 @Test void groupSeatCancellationAllowsExplicitReopeningAndReplacement(){
  var owner=user("owner");var buyer=user("buyer");var next=user("next");var p=post(owner,PostType.GROUP_BUY);
  var request=trades.createRequest(p.getId(),buyer.getId());trades.accept(request.requestId(),owner.getId());
  trades.cancelMarketTrade(request.requestId(),buyer.getId(),"기타");
  assertEquals(1,p.getCurrentParticipantCount());assertFalse(p.isOpen());
  assertThrows(BusinessException.class,()->trades.reopenMarketTrade(request.requestId(),owner.getId(),true));
  assertThrows(BusinessException.class,()->trades.createRequest(p.getId(),next.getId()));
  assertThrows(BusinessException.class,()->trades.reopenGroupBuy(p.getId(),buyer.getId(),true,LocalDateTime.now().plusDays(1)));
  assertThrows(BusinessException.class,()->trades.reopenGroupBuy(p.getId(),owner.getId(),false,LocalDateTime.now().plusDays(1)));
  trades.reopenGroupBuy(p.getId(),owner.getId(),true,LocalDateTime.now().plusDays(1));
  assertTrue(p.isOpen());
  var replacement=trades.createRequest(p.getId(),next.getId());
  var accepted=trades.accept(replacement.requestId(),owner.getId());
  assertEquals(2,p.getCurrentParticipantCount());
  assertTrue(chats.canAccessRoom(next.getId(),accepted.chatRoomId()));
  assertFalse(chats.canAccessRoom(buyer.getId(),accepted.chatRoomId()));
 }
 @Test void automaticRejectionNotifiesOtherBuyer(){
  var owner=user("owner");var buyer=user("buyer");var next=user("next");var p=post(owner,PostType.SALE);
  var winner=trades.createRequest(p.getId(),buyer.getId());var loser=trades.createRequest(p.getId(),next.getId());
  trades.accept(winner.requestId(),owner.getId());
  assertEquals(TradeRequestStatus.REJECTED,requests.findById(loser.requestId()).orElseThrow().getStatus());
  assertEquals(1,notes.findAllByUserIdOrderByCreatedAtDesc(next.getId()).stream().filter(n->"TRADE_REJECTED".equals(n.getType())).count());
 }
 @Test void historicalReportDoesNotExposeMessagesAfterLeavingOrToOutsiders(){
  var owner=user("owner");var buyer=user("buyer");var outsider=user("outsider");var p=post(owner,PostType.SALE);
  var request=trades.createRequest(p.getId(),buyer.getId());var accepted=trades.accept(request.requestId(),owner.getId());
  var old=chats.sendMessage(owner.getId(),accepted.chatRoomId(),"이전 대화");
  moderation.blockUser(owner.getId(),buyer.getId());
  var room=em.find(com.hjs.foodshare.chat.domain.ChatRoom.class,accepted.chatRoomId());
  var future=com.hjs.foodshare.chat.domain.ChatMessage.user(room,owner,"퇴장 이후 비공개");
  org.springframework.test.util.ReflectionTestUtils.setField(future,"createdAt",LocalDateTime.now().plusMinutes(1));em.persist(future);em.flush();
  assertEquals(java.util.List.of(old.messageId()),chats.reportableMessages(buyer.getId(),request.requestId(),null).stream().map(m->m.messageId()).toList());
  assertThrows(BusinessException.class,()->moderation.createReport(buyer.getId(),new ReportCreateRequest(ReportTargetType.CHAT_MESSAGE,future.getId(),"신고",null)));
  assertThrows(BusinessException.class,()->chats.reportableMessages(outsider.getId(),request.requestId(),null));
  assertThrows(BusinessException.class,()->moderation.createReport(outsider.getId(),new ReportCreateRequest(ReportTargetType.CHAT_MESSAGE,old.messageId(),"신고",null)));
 }
 @Test void returningGroupParticipantRegainsChatOnlyAfterAcceptance(){
  var owner=user("owner");var buyer=user("buyer");var p=post(owner,PostType.GROUP_BUY);
  var first=trades.createRequest(p.getId(),buyer.getId());var accepted=trades.accept(first.requestId(),owner.getId());
  trades.cancelMarketTrade(first.requestId(),buyer.getId(),"기타");
  trades.reopenGroupBuy(p.getId(),owner.getId(),true,LocalDateTime.now().plusDays(1));
  var next=trades.createRequest(p.getId(),buyer.getId());assertFalse(chats.canAccessRoom(buyer.getId(),accepted.chatRoomId()));
  var again=trades.accept(next.requestId(),owner.getId());assertEquals(accepted.chatRoomId(),again.chatRoomId());assertTrue(chats.canAccessRoom(buyer.getId(),again.chatRoomId()));
 }
 @Test void groupReopenRejectsPastDeadlineAndCompletionAlreadyStarted(){
  var owner=user("owner");var buyer=user("buyer");var p=post(owner,PostType.GROUP_BUY);
  assertThrows(BusinessException.class,()->trades.reopenGroupBuy(p.getId(),owner.getId(),true,LocalDateTime.now().minusMinutes(1)));
  var request=trades.createRequest(p.getId(),buyer.getId());trades.accept(request.requestId(),owner.getId());trades.complete(request.requestId(),owner.getId());
  assertThrows(BusinessException.class,()->trades.reopenGroupBuy(p.getId(),owner.getId(),true,LocalDateTime.now().plusDays(1)));
  assertFalse(p.isOpen());
 }
 @Test void groupReopenKeepsExistingParticipantsAndNotifiesOnce(){
  var owner=user("owner");var buyer=user("buyer");var leaving=user("leaving");var next=user("next");
  var p=posts.save(Post.create(owner,PostType.GROUP_BUY,"공구","쌀","1kg",1000,"서울",0.0,LocalDate.now().plusDays(3),37.5,127.0,null,"내용",1,3,LocalDateTime.now().plusDays(2)));
  var first=trades.createRequest(p.getId(),buyer.getId());trades.accept(first.requestId(),owner.getId());
  var second=trades.createRequest(p.getId(),leaving.getId());var closed=trades.accept(second.requestId(),owner.getId());trades.cancelMarketTrade(second.requestId(),leaving.getId(),"기타");
  var deadline=LocalDateTime.now().plusDays(1);trades.reopenGroupBuy(p.getId(),owner.getId(),true,deadline);trades.reopenGroupBuy(p.getId(),owner.getId(),true,deadline);
  assertEquals(2,p.getCurrentParticipantCount());assertEquals(TradeRequestStatus.ACCEPTED,requests.findById(first.requestId()).orElseThrow().getStatus());
  assertEquals(1,notes.findAllByUserIdOrderByCreatedAtDesc(buyer.getId()).stream().filter(n->"GROUP_BUY_REOPENED".equals(n.getType())).count());
  var replacement=trades.createRequest(p.getId(),next.getId());var filled=trades.accept(replacement.requestId(),owner.getId());assertEquals(closed.chatRoomId(),filled.chatRoomId());assertTrue(chats.canAccessRoom(buyer.getId(),filled.chatRoomId()));
 }
 @Test void hidingFridgeNotifiesPendingRequester(){
  var owner=user("owner");var buyer=user("buyer");var f=item(owner);open.publish(owner.getId(),f.getId(),"1개");
  var request=open.request(buyer.getId(),f.getId());open.hide(owner.getId(),f.getId());open.hide(owner.getId(),f.getId());
  assertEquals(TradeRequestStatus.REJECTED,requests.findById(request.requestId()).orElseThrow().getStatus());
  assertEquals(1,notes.findAllByUserIdOrderByCreatedAtDesc(buyer.getId()).stream().filter(n->"TRADE_REJECTED".equals(n.getType())).count());
 }
}
