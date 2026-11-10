package com.hjs.foodshare;
import com.hjs.foodshare.demo.*;
import com.hjs.foodshare.chat.service.ChatService;
import com.hjs.foodshare.notification.service.FcmPushService;
import com.hjs.foodshare.post.domain.*;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.post.repository.PostPageQuery;
import com.hjs.foodshare.post.dto.PostSort;
import com.hjs.foodshare.review.dto.ReviewCreateRequest;
import com.hjs.foodshare.review.service.*;
import com.hjs.foodshare.trade.domain.*;
import com.hjs.foodshare.trade.service.TradeRequestService;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import java.time.*;
import java.util.*;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:demo-simulation;MODE=MySQL;DATABASE_TO_LOWER=TRUE","app.demo.worker-enabled=false"})
@DirtiesContext(classMode=DirtiesContext.ClassMode.AFTER_CLASS)
class DemoSimulationTests {
 @Autowired EntityManager em;
 @Autowired PlatformTransactionManager manager;
 @Autowired UserRepository users;
 @Autowired PostRepository posts;
 @Autowired PostPageQuery pages;
 @Autowired TradeRequestService trades;
 @Autowired ChatService chats;
 @Autowired ReviewService reviews;
 @Autowired DemoSimulationService simulation;
 @Autowired DemoInboundSimulationService inbound;
 @Autowired DemoVisibility demo;
 @MockitoBean FcmPushService push;
 @MockitoBean DemoChatAi ai;
 <T>T tx(Supplier<T> f){return new TransactionTemplate(manager).execute(s->f.get());}
 User user(){String key=UUID.randomUUID().toString();return users.save(User.create("테스트",key.substring(0,12),key+"@demo.invalid","unused",key.substring(0,20),"서울"));}
 record Fixture(Long owner,Long user,Long other,Long post){}
 Fixture fixture(PostType type){return tx(()->{
  var state=em.find(DemoState.class,1L);if(state==null){state=new DemoState();em.persist(state);}state.setEnabled(true);
  var a=user();var b=user();var c=user();
  var p=posts.save(Post.create(a,type,"두부 같이 나눠요","두부","1개",1000,"역 앞",0.0,LocalDate.now().plusDays(3),37.5,127.0,null,"시연 재료",type==PostType.GROUP_BUY?1:null,type==PostType.GROUP_BUY?4:null,type==PostType.GROUP_BUY?LocalDateTime.now().plusDays(3):null));em.persist(new DemoPost(p.getId()));return new Fixture(a.getId(),b.getId(),c.getId(),p.getId());
 });}
 Long request(Fixture f,Long user){return trades.createRequest(f.post,user).requestId();}
 void due(Long id){tx(()->{em.find(DemoSession.class,id).dueAt=LocalDateTime.now().minusSeconds(1);return null;});}
 Long room(Long id){return tx(()->em.find(DemoSession.class,id).roomId);}
 @Test void newAccountsGetIndependentTradesAndOriginalStaysOpen(){
  var f=fixture(PostType.SHARE);var a=request(f,f.user);var b=request(f,f.other);
  simulation.advance(a);assertNull(room(a));
  due(a);due(b);simulation.advance(a);simulation.advance(b);
  assertNotNull(room(a));assertNotEquals(room(a),room(b));
  assertTrue(chats.getMessages(f.user,room(a)).stream().noneMatch(m->!m.systemMessage()));
  assertTrue(chats.getRooms(f.user,"ALL").stream().anyMatch(r->r.chatRoomId().equals(room(a)) && r.simulation()));
  assertTrue(tx(()->posts.findById(f.post).orElseThrow().isOpen()));
  assertEquals(TradeRequestStatus.ACCEPTED,trades.getMyRequestForPost(f.user,f.post).getFirst().status());
  assertThrows(Exception.class,()->request(f,f.user));
  assertThrows(Exception.class,()->chats.getMessages(f.other,room(a)));
  assertTrue(tx(()->demo.hiddenPostIds().contains(em.find(DemoSession.class,a).privatePostId)));
 }
 @Test void aiRepliesAndResetPreservesRealReviewChanges(){
  var f=fixture(PostType.SALE);var a=request(f,f.user);due(a);simulation.advance(a);
  when(ai.reply(anyString())).thenReturn("내일 오후는 어떠세요?");
  chats.sendMessage(f.user,room(a),"언제 받을 수 있나요?");due(a);simulation.advance(a);
  assertTrue(chats.getMessages(f.user,room(a)).stream().anyMatch(m->m.content().equals("내일 오후는 어떠세요?")));
  trades.complete(a,f.user);due(a);simulation.advance(a);
  assertEquals(TradeRequestStatus.COMPLETED,trades.getMyRequestForPost(f.user,f.post).getFirst().status());
  double before=tx(()->em.find(DemoScore.class,f.user).score);
  assertTrue(tx(()->users.findById(f.user).orElseThrow().getFreshnessScore())>before);
  // A real trade review after the simulation must survive reset and be replayed against the original score.
  var real=tx(()->posts.save(Post.create(users.findById(f.other).orElseThrow(),PostType.SHARE,"실제 글","양파","1개",0,"역",0.0,LocalDate.now().plusDays(3),37.5,127.0,null,"실제",null,null,null)).getId());
  var actual=trades.createRequest(real,f.user).requestId();trades.accept(actual,f.other);trades.complete(actual,f.user);trades.complete(actual,f.other);reviews.createReview(actual,f.other,new ReviewCreateRequest(4,"실제 평가"));
  assertEquals(1,simulation.resetMine(f.user));
  assertEquals(FreshnessCalculator.update(before,4),tx(()->users.findById(f.user).orElseThrow().getFreshnessScore()));
  assertTrue(trades.getMyRequestForPost(f.user,f.post).isEmpty());
  assertTrue(trades.getMyRequests(f.user).stream().anyMatch(r->r.requestId().equals(actual)&&r.status()==TradeRequestStatus.COMPLETED));
  assertFalse(chats.getRooms(f.user,null).stream().anyMatch(r->r.chatRoomId().equals(room(a))));
  assertEquals(0,simulation.resetMine(f.user));assertNotNull(request(f,f.user));
 }
 @Test void groupBuyAutoOpensSeparateRoomWithoutClosingTemplate(){
  var f=fixture(PostType.GROUP_BUY);var a=request(f,f.user);due(a);simulation.advance(a);assertNotNull(room(a));
  assertTrue(tx(()->posts.findById(f.post).orElseThrow().isOpen()));
  trades.complete(a,f.user);due(a);simulation.advance(a);
  assertEquals(TradeRequestStatus.COMPLETED,trades.getMyRequestForPost(f.user,f.post).getFirst().status());
 }
 @Test void resetOnlyAffectsCallerAndStopsLateAiResponse(){
  var f=fixture(PostType.SHARE);var a=request(f,f.user);var b=request(f,f.other);due(a);due(b);simulation.advance(a);simulation.advance(b);
  chats.sendMessage(f.user,room(a),"안녕하세요");
  when(ai.reply(anyString())).thenAnswer(i->{simulation.resetMine(f.user);return "늦은 응답";});
  due(a);simulation.advance(a);
  assertTrue(tx(()->em.find(DemoSession.class,a).reset));assertFalse(tx(()->em.find(DemoSession.class,b).reset));
  assertEquals(TradeRequestStatus.ACCEPTED,trades.getMyRequestForPost(f.other,f.post).getFirst().status());
  assertEquals(0L,tx(()->em.createQuery("select count(m) from ChatMessage m where m.chatRoom.id=:room and m.content='늦은 응답'",Long.class).setParameter("room",room(a)).getSingleResult()));
 }
 @Test void demoMarketLatestKeepsPurchaseRequestsBelowSharingPosts(){
  var f=fixture(PostType.SHARE);
  var buyer=tx(()->users.findById(f.other).orElseThrow());
  tx(()->{posts.save(Post.create(buyer,PostType.BUY,"두부 구해요","두부","1개",1000,"역 앞",0.0,LocalDate.now().plusDays(3),37.5,127.0,null,"구합니다",null,null,null));return null;});
  var result=pages.search(null,null,null,null,null,false,PostSort.LATEST,null,true,0,100).posts();
  int firstBuy=-1,lastShare=-1;
  for(int i=0;i<result.size();i++){
   if(result.get(i).getPostType()==PostType.BUY && firstBuy<0)firstBuy=i;
   if(result.get(i).getPostType()==PostType.SHARE)lastShare=i;
  }
  assertTrue(firstBuy>=0 && lastShare>=0 && lastShare<firstBuy);
 }
 @Test void inboundPostGetsAutomaticRequestGreetingReplyAndReview(){
  var fixture=fixture(PostType.SHARE);
  Long original=tx(()->{
   var author=users.findById(fixture.user).orElseThrow();
   var post=posts.save(Post.create(author,PostType.SALE,"당근 한 봉지","당근","1봉",2000,"역 앞",0.0,
    LocalDate.now().plusDays(3),37.5,127.0,null,"당근 판매합니다",null,null,null));
   inbound.schedule(post);
   return post.getId();
  });
  assertNotNull(tx(()->em.find(DemoInboundJob.class,original)));
  tx(()->{em.find(DemoInboundJob.class,original).dueAt=LocalDateTime.now().minusSeconds(1);return null;});
  assertNull(inbound.prepare(original));
  Long request=tx(()->em.find(DemoInboundJob.class,original).requestId);
  assertNotNull(request);
  assertEquals(TradeRequestStatus.PENDING,tx(()->em.find(TradeRequest.class,request).getStatus()));
  trades.accept(request,fixture.user);
  Long chat=chats.findRoomIdByTradeRequestId(request);
  assertNotNull(chat);
  assertTrue(chats.getRooms(fixture.user,"ALL").stream().anyMatch(r->r.chatRoomId().equals(chat)&&r.simulation()));
  tx(()->{em.find(DemoInboundJob.class,original).dueAt=LocalDateTime.now().minusSeconds(1);return null;});
  inbound.prepare(original); // Set a ten-second greeting delay after acceptance.
  assertNotNull(tx(()->em.find(DemoInboundJob.class,original).acceptedAt));
  assertFalse(tx(()->em.find(DemoInboundJob.class,original).greeted));
  tx(()->{em.find(DemoInboundJob.class,original).dueAt=LocalDateTime.now().minusSeconds(1);return null;});
  inbound.prepare(original);
  assertTrue(chats.getMessages(fixture.user,chat).stream().anyMatch(m->m.content().contains("구매하고 싶어서")));
  when(ai.reply(anyString())).thenReturn("내일 오후면 괜찮아요!");
  chats.sendMessage(fixture.user,chat,"내일 오후 괜찮으세요?");
  tx(()->{em.find(DemoInboundJob.class,original).dueAt=LocalDateTime.now().minusSeconds(1);return null;});
  var prompt=inbound.prepare(original);
  assertNotNull(prompt);
  inbound.respond(prompt);
  assertTrue(chats.getMessages(fixture.user,chat).stream().anyMatch(m->m.content().equals("내일 오후면 괜찮아요!")));
  trades.complete(request,fixture.user);
  tx(()->{em.find(DemoInboundJob.class,original).dueAt=LocalDateTime.now().minusSeconds(1);return null;});
  inbound.prepare(original);
  tx(()->{em.find(DemoInboundJob.class,original).dueAt=LocalDateTime.now().minusSeconds(1);return null;});
  inbound.prepare(original);
  assertEquals(TradeRequestStatus.COMPLETED,tx(()->em.find(TradeRequest.class,request).getStatus()));
  assertTrue(tx(()->em.createQuery("select count(r) from Review r where r.tradeRequest.id=:id and r.reviewer.id=:actor",Long.class)
    .setParameter("id",request).setParameter("actor",fixture.owner).getSingleResult())>0);
  assertTrue(tx(()->users.findById(fixture.user).orElseThrow().getFreshnessScore())>50);
 }
 @Test void incomingGreetingMatchesShareAndBuyPosts(){
  var f=fixture(PostType.SALE);
  for(PostType type:List.of(PostType.SHARE,PostType.BUY)){
   Long postId=tx(()->{
    var p=posts.save(Post.create(users.findById(f.user).orElseThrow(),type,
      type==PostType.SHARE?"감자 나눔":"감자 구합니다","감자","2개",type==PostType.SHARE?0:2000,
      "역 앞",0.0,LocalDate.now().plusDays(2),37.5,127.0,null,"상태 양호",null,null,null));
    inbound.schedule(p);return p.getId();
   });
   tx(()->{em.find(DemoInboundJob.class,postId).dueAt=LocalDateTime.now().minusSeconds(1);return null;});
   inbound.prepare(postId);
   Long requestId=tx(()->em.find(DemoInboundJob.class,postId).requestId);
   assertNotNull(requestId);
   trades.accept(requestId,f.user);
   tx(()->{em.find(DemoInboundJob.class,postId).dueAt=LocalDateTime.now().minusSeconds(1);return null;});
   inbound.prepare(postId);
   tx(()->{em.find(DemoInboundJob.class,postId).dueAt=LocalDateTime.now().minusSeconds(1);return null;});
   inbound.prepare(postId);
   Long chat=chats.findRoomIdByTradeRequestId(requestId);
   String greeting=chats.getMessages(f.user,chat).stream().filter(m->!m.systemMessage()).map(m->m.content()).findFirst().orElse("");
   assertTrue(greeting.contains(type==PostType.SHARE?"받아보고 싶어서요":"아직 찾고 계신가요"),greeting);
  }
 }
 @Test void inboundDoesNotScheduleWhenDemoModeIsOff(){
  var fixture=fixture(PostType.SHARE);
  Long post=tx(()->{
   em.find(DemoState.class,1L).setEnabled(false);
   var p=posts.save(Post.create(users.findById(fixture.user).orElseThrow(),PostType.BUY,"토마토 구해요","토마토","1개",1000,"역",0.0,
     LocalDate.now().plusDays(2),37.5,127.0,null,"구매 희망",null,null,null));
   inbound.schedule(p);
   return p.getId();
  });
  assertNull(tx(()->em.find(DemoInboundJob.class,post)));
 }
 @Test void withdrawnRequestsAreNotAutoAcceptedAndHiddenModeStopsNewRequests(){
  var f=fixture(PostType.SHARE);var a=request(f,f.user);trades.withdrawTradeRequest(a,f.user);due(a);simulation.advance(a);assertNull(room(a));
  tx(()->{em.find(DemoState.class,1L).setEnabled(false);return null;});assertThrows(Exception.class,()->request(f,f.other));
 }
}
