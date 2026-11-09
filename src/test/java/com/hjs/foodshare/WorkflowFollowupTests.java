package com.hjs.foodshare;

import com.hjs.foodshare.user.domain.*;
import com.hjs.foodshare.user.repository.*;
import com.hjs.foodshare.post.domain.*;
import com.hjs.foodshare.post.dto.PostCreateRequest;
import com.hjs.foodshare.post.dto.PostSort;
import com.hjs.foodshare.post.dto.PostUpdateRequest;
import com.hjs.foodshare.post.repository.*;
import com.hjs.foodshare.post.service.PostService;
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
 @Autowired PostService market;
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

 @Test void onlyRequesterCanWithdrawPendingRequestAndApplyAgain() {
  var owner = user("withdraw-owner");
  var buyer = user("withdraw-buyer");
  var p = post(owner, PostType.SHARE);
  var first = trades.createRequest(p.getId(), buyer.getId());
  assertThrows(BusinessException.class, () -> trades.withdrawTradeRequest(first.requestId(), owner.getId()));
  assertEquals(TradeRequestStatus.CANCELLED, trades.withdrawTradeRequest(first.requestId(), buyer.getId()).status());
  assertEquals(TradeRequestStatus.CANCELLED, trades.withdrawTradeRequest(first.requestId(), buyer.getId()).status());
  assertThrows(BusinessException.class, () -> trades.accept(first.requestId(), owner.getId()));
  var second = trades.createRequest(p.getId(), buyer.getId());
  assertNotEquals(first.requestId(), second.requestId());
  trades.accept(second.requestId(), owner.getId());
  assertThrows(BusinessException.class, () -> trades.withdrawTradeRequest(second.requestId(), buyer.getId()));
  assertEquals(TradeRequestStatus.ACCEPTED, requests.findById(second.requestId()).orElseThrow().getStatus());
 }

 @Test void cancelledDirectChatDisablesBothSidesAndRetainsReportEvidence() {
  var owner = user("cancel-chat-owner");
  var buyer = user("cancel-chat-buyer");
  var p = post(owner, PostType.SALE);
  var pending = trades.createRequest(p.getId(), buyer.getId());
  var roomId = trades.accept(pending.requestId(), owner.getId()).chatRoomId();
  var message = chats.sendMessage(owner.getId(), roomId, "신고할 메시지");
  assertTrue(chats.canAccessRoom(buyer.getId(), roomId));
  trades.cancelMarketTrade(pending.requestId(), buyer.getId(), "기타");
  for (var participant : java.util.List.of(owner, buyer)) {
   assertFalse(chats.canAccessRoom(participant.getId(), roomId));
   var visible = chats.getRooms(participant.getId(), "ALL").getFirst();
   assertEquals(roomId, visible.chatRoomId());
   assertTrue(visible.readOnly());
   assertEquals(0, visible.unreadCount());
   assertTrue(chats.getMessages(participant.getId(), roomId).stream().anyMatch(row -> row.messageId().equals(message.messageId())));
   assertThrows(BusinessException.class, () -> chats.sendMessage(participant.getId(), roomId, "새 메시지"));
  }
  assertEquals(roomId, chats.findRoomIdByTradeRequestId(pending.requestId()));
  assertEquals(message.messageId(), chats.reportableMessages(buyer.getId(), pending.requestId(), null).getFirst().messageId());
  var report = moderation.createReport(buyer.getId(), new ReportCreateRequest(
          ReportTargetType.CHAT_MESSAGE, message.messageId(), "욕설", null));
  assertTrue(report.evidence().contains("신고할 메시지"));
 }

 @Test void groupChatClosesWhenLastAcceptedSeatIsCancelled() {
  var owner = user("cancel-group-owner");
  var buyer = user("cancel-group-buyer");
  var p = post(owner, PostType.GROUP_BUY);
  var request = trades.createRequest(p.getId(), buyer.getId());
  var roomId = trades.accept(request.requestId(), owner.getId()).chatRoomId();
  trades.cancelMarketTrade(request.requestId(), buyer.getId(), "기타");
  assertFalse(chats.canAccessRoom(owner.getId(), roomId));
  assertFalse(chats.canAccessRoom(buyer.getId(), roomId));
  assertTrue(chats.getRooms(owner.getId(), "ALL").getFirst().readOnly());
  assertTrue(chats.getRooms(buyer.getId(), "ALL").getFirst().readOnly());
  assertEquals(roomId, chats.findRoomIdByTradeRequestId(request.requestId()));
 }

 @Test void cancelledGroupMemberCanReadOnlyMessagesFromTheirParticipation() {
  var owner = user("readonly-group-owner");
  var leaving = user("readonly-group-leaving");
  var remaining = user("readonly-group-remaining");
  var outsider = user("readonly-group-outsider");
  var p = post(owner, PostType.GROUP_BUY);
  org.springframework.test.util.ReflectionTestUtils.setField(p, "targetParticipantCount", 3);
  var first = trades.createRequest(p.getId(), leaving.getId());
  trades.accept(first.requestId(), owner.getId());
  var second = trades.createRequest(p.getId(), remaining.getId());
  var roomId = trades.accept(second.requestId(), owner.getId()).chatRoomId();
  var before = chats.sendMessage(owner.getId(), roomId, "취소 전 대화");
  trades.cancelMarketTrade(first.requestId(), leaving.getId(), "기타");
  var after = chats.sendMessage(remaining.getId(), roomId, "취소 후 대화");

  var room = chats.getRooms(leaving.getId(), "ALL").getFirst();
  assertTrue(room.readOnly());
  assertNotEquals(after.content(), room.lastMessage());
  assertTrue(room.participants().isEmpty());
  assertEquals(java.util.List.of(before.messageId()), chats.getMessages(leaving.getId(), roomId).stream()
          .filter(message -> !message.systemMessage()).map(message -> message.messageId()).toList());
  assertFalse(chats.getRooms(remaining.getId(), "ALL").getFirst().readOnly());
  assertEquals(after.content(), chats.getRooms(remaining.getId(), "ALL").getFirst().lastMessage());
  assertThrows(BusinessException.class, () -> chats.getMessages(outsider.getId(), roomId));
  assertThrows(BusinessException.class, () -> chats.sendMessage(leaving.getId(), roomId, "전송 시도"));
 }

 @Test void purchasePostAcceptsLegacyBlankExpirationFromHiddenField() {
  var owner = user("buyer-post-owner");
  var payload = new PostCreateRequest(PostType.BUY, "두부 구매", "두부", "1개", "희망가 협의",
          "서울 강남구 역삼동", 0.0, 37.5, 127.0, "", null, "두부를 구매합니다.", null, null, null);
  var created = market.createPost(owner.getId(), payload);
  assertEquals(PostType.BUY, created.postType());
  assertEquals(LocalDate.now(ZoneId.of("Asia/Seoul")).plusDays(7), created.expirationDate());
 }

 @Test void existingPurchaseDeadlineOverridesOldDefaultExpiration() {
  var owner = user("purchase-deadline-owner");
  var seller = user("purchase-deadline-seller");
  var now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
  var deadline = now.plusDays(20).withMinute(0).withSecond(0).withNano(0);
  var existing = posts.save(Post.create(owner, PostType.BUY, "기존 구매글", "두부", "1개",
          1000, "서울", 0.0, now.toLocalDate().minusDays(1), 37.5, 127.0,
          null, "두부를 구매합니다.", null, null, deadline));
  var results = market.searchPostsPage(PostType.BUY, "기존 구매글", null, null, null, false,
          PostSort.EXPIRING_SOON, seller.getId(), 0, 30);
  assertEquals(existing.getId(), results.content().getFirst().postId());
  assertEquals(deadline.toLocalDate(), results.content().getFirst().expirationDate());
  assertEquals(TradeRequestStatus.PENDING, trades.createRequest(existing.getId(), seller.getId()).status());
 }

 @Test void purchasePostExpiresOnRequestedDeadlineRatherThanSevenDays() {
  var owner = user("buyer-deadline-owner");
  var deadline = LocalDateTime.now(ZoneId.of("Asia/Seoul")).plusDays(20).withSecond(0).withNano(0);
  var payload = new PostCreateRequest(PostType.BUY, "두부 구매", "두부", "1개", "희망가 협의",
          "서울 강남구 역삼동", 0.0, 37.5, 127.0, "", null, "두부를 구매합니다.", null, null, deadline);
  var created = market.createPost(owner.getId(), payload);
  assertEquals(deadline.toLocalDate(), created.expirationDate());
  assertTrue(market.getPosts(owner.getId()).stream().anyMatch(row -> row.postId().equals(created.postId())));

  var update = new PostUpdateRequest(PostType.BUY, "두부 구매 수정", "두부", "2개", "희망가 협의",
          "서울 강남구 역삼동", 0.0, 37.5, 127.0, "", null, "수정한 구매글", null, null, deadline);
  var updated = market.updatePost(created.postId(), owner.getId(), update);
  assertEquals(deadline.toLocalDate(), updated.expirationDate());
 }

 @Test void expiredMarketDeadlinesAreRejectedOnCreateAndUpdate() {
  var owner = user("expired-market-owner");
  var past = LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusMinutes(10);
  var attempted = new PostCreateRequest(PostType.BUY, "두부 구매", "두부", "1개", "희망가 협의",
          "서울 강남구 역삼동", 0.0, 37.5, 127.0, "", null, "내용", null, null, past);
  assertThrows(BusinessException.class, () -> market.createPost(owner.getId(), attempted));

  var valid = new PostCreateRequest(PostType.BUY, "두부 구매", "두부", "1개", "희망가 협의",
          "서울 강남구 역삼동", 0.0, 37.5, 127.0, "", null, "내용", null, null, null);
  var created = market.createPost(owner.getId(), valid);
  var update = new PostUpdateRequest(PostType.BUY, "수정", "두부", "1개", "희망가 협의",
          "서울 강남구 역삼동", 0.0, 37.5, 127.0, "", null, "내용", null, null, past);
  assertThrows(BusinessException.class, () -> market.updatePost(created.postId(), owner.getId(), update));
 }

 @Test void marketDeadlineClosesListingAndBlocksNewRequestsAndAcceptance() {
  var owner = user("market-deadline-owner");
  var buyer = user("market-deadline-buyer");
  var other = user("market-deadline-other");
  var p = post(owner, PostType.SALE);
  var pending = trades.createRequest(p.getId(), buyer.getId());
  org.springframework.test.util.ReflectionTestUtils.setField(
          p, "deadlineDate", LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusMinutes(1));
  em.flush();

  assertEquals(PostStatus.CLOSED, market.getPost(p.getId(), buyer.getId()).status());
  assertTrue(market.getPosts(buyer.getId()).stream().noneMatch(row -> row.postId().equals(p.getId())));
  assertThrows(BusinessException.class, () -> trades.createRequest(p.getId(), other.getId()));
  assertThrows(BusinessException.class, () -> trades.accept(pending.requestId(), owner.getId()));
  assertEquals(TradeRequestStatus.PENDING, requests.findById(pending.requestId()).orElseThrow().getStatus());
 }
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
 @Test void historicalListingUsesDatabaseTimestampPrecision(){
  var owner=user("owner");var buyer=user("buyer");var p=post(owner,PostType.SALE);
  var request=trades.createRequest(p.getId(),buyer.getId());var accepted=trades.accept(request.requestId(),owner.getId());
  var message=chats.sendMessage(owner.getId(),accepted.chatRoomId(),"boundary message");
  moderation.blockUser(buyer.getId(),owner.getId());
  var member=em.createQuery("select m from ChatRoomMember m where m.chatRoom.id=:room and m.user.id=:user",com.hjs.foodshare.chat.domain.ChatRoomMember.class).setParameter("room",accepted.chatRoomId()).setParameter("user",buyer.getId()).getSingleResult();
  var entity=em.find(com.hjs.foodshare.chat.domain.ChatMessage.class,message.messageId());
  var instant=LocalDateTime.now().plusSeconds(1).withNano(123456600);
  org.springframework.test.util.ReflectionTestUtils.setField(entity,"createdAt",instant);
  org.springframework.test.util.ReflectionTestUtils.setField(member,"leftAt",instant.plusNanos(100));
  em.flush();
  assertEquals(message.messageId(),chats.reportableMessages(buyer.getId(),request.requestId(),null).getFirst().messageId());
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
  assertFalse(trades.getReceivedRequests(owner.getId()).stream().filter(r->r.requestId().equals(request.requestId())).findFirst().orElseThrow().reopenCandidate());
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
