package com.hjs.foodshare;
import com.hjs.foodshare.user.domain.*;
import com.hjs.foodshare.user.repository.*;
import com.hjs.foodshare.post.domain.*;
import com.hjs.foodshare.post.repository.*;
import com.hjs.foodshare.trade.service.*;
import com.hjs.foodshare.trade.domain.*;
import com.hjs.foodshare.trade.repository.*;
import com.hjs.foodshare.chat.service.*;
import com.hjs.foodshare.notification.service.*;
import com.hjs.foodshare.notification.repository.*;
import com.hjs.foodshare.global.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.util.ReflectionTestUtils;
import jakarta.persistence.*;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest(properties="app.upload.dir=build/test-uploads") @Transactional
class MarketCancellationTests {
 @Autowired UserRepository users;
 @Autowired PostRepository posts;
 @Autowired TradeRequestService trades;
 @Autowired TradeRequestRepository requests;
 @Autowired ChatService chat;
 @Autowired NotificationRepository notes;
 @MockitoBean FcmPushService fcm;
 @PersistenceContext EntityManager em;
 User user(String n){return users.save(User.create(n,n,n+"@cancel.local","pw","010"+n,"서울"));}
 Post post(User u){return posts.save(Post.create(u,PostType.SHARE,"두부","두부","1개",0,"서울",0.0,LocalDate.now().plusDays(3),37.5,127.0,null,"test",null,null,null));}
 @Test void pendingRequesterCanWithdrawAndRequestAgainWithoutErasingHistory(){
  var owner=user("owner");var buyer=user("buyer");var p=post(owner);
  Long id=trades.createRequest(p.getId(),buyer.getId()).requestId();
  var result=trades.cancelMarketTrade(id,buyer.getId(),"생각이 바뀌었어요");
  assertEquals(TradeRequestStatus.CANCELLED,result.status());assertFalse(result.reopenCandidate());assertEquals(PostStatus.OPEN,p.getStatus());
  Long newId=trades.createRequest(p.getId(),buyer.getId()).requestId();assertNotEquals(id,newId);assertEquals(2,requests.findAllByPostIdOrderByCreatedAtDesc(p.getId()).size());
 }
 @Test void buyerCancelsAcceptedTradeWithoutConsentAndOwnerExplicitlyReopens(){
  var owner=user("owner");var buyer=user("buyer");var p=post(owner);
  Long id=trades.createRequest(p.getId(),buyer.getId()).requestId();Long room=trades.accept(id,owner.getId()).chatRoomId();
  double freshness=buyer.getFreshnessScore();var response=trades.cancelMarketTrade(id,buyer.getId(),"연락이 닿지 않아요");
  assertEquals(TradeRequestStatus.CANCELLED,response.status());assertEquals(buyer.getId(),response.cancelledBy());assertEquals(PostStatus.CLOSED,p.getStatus());
  assertEquals(room,response.chatRoomId());assertTrue(chat.getMessages(owner.getId(),room).stream().anyMatch(m->m.systemMessage() && m.content().contains("취소")));assertEquals(freshness,buyer.getFreshnessScore());
  long count=notes.count();trades.cancelMarketTrade(id,buyer.getId(),"기타");assertEquals(count,notes.count());
  assertThrows(BusinessException.class,()->trades.reopenMarketTrade(id,buyer.getId(),true));
 }
 @Test void ownerCanCancelAndReopenAfterConfirmingCondition(){
  var owner=user("owner");var buyer=user("buyer");var p=post(owner);
  Long id=trades.createRequest(p.getId(),buyer.getId()).requestId();trades.accept(id,owner.getId());trades.cancelMarketTrade(id,owner.getId(),"일정이 맞지 않아요");
  var result=trades.reopenMarketTrade(id,owner.getId(),true);assertEquals(PostStatus.OPEN,p.getStatus());assertFalse(result.reopenCandidate());
  assertEquals(TradeRequestStatus.CANCELLED,requests.findById(id).orElseThrow().getStatus());
  Long again=trades.createRequest(p.getId(),buyer.getId()).requestId();assertNotEquals(id,again);
 }
 @Test void outsiderCannotCancel(){
  var owner=user("owner");var p=post(owner);Long id=trades.createRequest(p.getId(),user("buyer").getId()).requestId();trades.accept(id,owner.getId());
  assertThrows(BusinessException.class,()->trades.cancelMarketTrade(id,user("stranger").getId(),"기타"));assertEquals(TradeRequestStatus.ACCEPTED,requests.findById(id).orElseThrow().getStatus());
 }
 @Test void completedTradeCannotBeCancelled(){
  var owner=user("owner");var p=post(owner);Long id=trades.createRequest(p.getId(),user("buyer").getId()).requestId();trades.accept(id,owner.getId());trades.complete(id,owner.getId());
  assertThrows(BusinessException.class,()->trades.cancelMarketTrade(id,owner.getId(),"기타"));assertEquals(TradeRequestStatus.COMPLETED,requests.findById(id).orElseThrow().getStatus());
 }
 @Test void cancelledTradeCannotBeCompleted(){
  var owner=user("owner");var p=post(owner);Long id=trades.createRequest(p.getId(),user("buyer").getId()).requestId();trades.accept(id,owner.getId());trades.cancelMarketTrade(id,owner.getId(),"기타");
  assertThrows(BusinessException.class,()->trades.complete(id,owner.getId()));
 }
 @Test void expiredPostCannotReopen(){
  var owner=user("owner");var p=post(owner);Long id=trades.createRequest(p.getId(),user("buyer").getId()).requestId();trades.accept(id,owner.getId());trades.cancelMarketTrade(id,owner.getId(),"기타");
  ReflectionTestUtils.setField(p,"expirationDate",LocalDate.now().minusDays(1));em.flush();
  assertThrows(BusinessException.class,()->trades.reopenMarketTrade(id,owner.getId(),true));assertEquals(PostStatus.CLOSED,p.getStatus());
 }
 @Test void groupAndFridgeTradesCannotUseMarketCancellation(){
  var owner=user("owner");var p=post(owner);ReflectionTestUtils.setField(p,"postType",PostType.GROUP_BUY);ReflectionTestUtils.setField(p,"targetParticipantCount",3);ReflectionTestUtils.setField(p,"currentParticipantCount",1);ReflectionTestUtils.setField(p,"deadlineDate",LocalDateTime.now().plusDays(1));
  Long id=trades.createRequest(p.getId(),user("buyer").getId()).requestId();
  assertThrows(BusinessException.class,()->trades.cancelMarketTrade(id,owner.getId(),"기타"));
 }
}
