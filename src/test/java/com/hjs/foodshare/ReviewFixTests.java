package com.hjs.foodshare;
import com.hjs.foodshare.user.domain.*;
import com.hjs.foodshare.user.repository.*;
import com.hjs.foodshare.post.domain.*;
import com.hjs.foodshare.post.dto.*;
import com.hjs.foodshare.post.repository.*;
import com.hjs.foodshare.post.service.*;
import com.hjs.foodshare.trade.service.*;
import com.hjs.foodshare.trade.domain.*;
import com.hjs.foodshare.trade.repository.*;
import com.hjs.foodshare.chat.service.*;
import com.hjs.foodshare.chat.repository.*;
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
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest(properties="app.upload.dir=build/test-uploads") @Transactional
class ReviewFixTests {
 @Autowired UserRepository users;
 @Autowired PostRepository posts;
 @Autowired PostService market;
 @Autowired TradeRequestService trades;
 @Autowired TradeRequestRepository requests;
 @Autowired GroupBuyExpirationScheduler scheduler;
 @Autowired ChatService chat;
 @Autowired ChatRoomRepository rooms;
 @Autowired NotificationRepository notes;
 @MockitoBean FcmPushService fcm;
 @PersistenceContext EntityManager em;
 User user(String n){return users.save(User.create(n,n,n+"@review.local","pw","010"+n,"서울"));}
 Post post(User u,PostType type,String title,int target,double lat){return posts.save(Post.create(u,type,title,"rice","1",1000,"서울",0.0,LocalDate.now().plusDays(5),lat,127.0,null,"review",type==PostType.GROUP_BUY?1:null,type==PostType.GROUP_BUY?target:null,type==PostType.GROUP_BUY?LocalDateTime.now().plusDays(2):null));}
 void expire(Post p){ReflectionTestUtils.setField(p,"deadlineDate",LocalDateTime.now().minusMinutes(1));em.flush();}
 @Test void excessRequestsCannotBeBulkAccepted(){
 var owner=user("owner");var p=post(owner,PostType.GROUP_BUY,"capacity",3,37.5);
 var ids=new ArrayList<Long>();for(int i=0;i<5;i++)ids.add(trades.createRequest(p.getId(),user("buyer"+i).getId()).requestId());
 assertThrows(BusinessException.class,()->trades.closeGroupBuyRecruitment(p.getId(),owner.getId()));
 assertEquals(1,p.getCurrentParticipantCount());assertEquals(5,requests.findAllByPostIdAndStatus(p.getId(),TradeRequestStatus.PENDING).size());
 }
 @Test void bulkCloseWithinCapacityCreatesOneRoomAndDoesNotReopen(){
 var owner=user("owner");var p=post(owner,PostType.GROUP_BUY,"capacity",3,37.5);
 trades.createRequest(p.getId(),user("a").getId());trades.createRequest(p.getId(),user("b").getId());
 var result=trades.closeGroupBuyRecruitment(p.getId(),owner.getId());
 assertEquals(3,p.getCurrentParticipantCount());assertEquals(2,result.size());assertNotNull(result.get(0).chatRoomId());
 assertEquals(result.get(0).chatRoomId(),result.get(1).chatRoomId());
 assertThrows(BusinessException.class,()->trades.closeGroupBuyRecruitment(p.getId(),owner.getId()));
 }
 @Test void expiryFinalizesAcceptedRejectsPendingAndIsIdempotent(){
 var owner=user("owner");var p=post(owner,PostType.GROUP_BUY,"expiry",4,37.5);
 var a=trades.createRequest(p.getId(),user("a").getId()).requestId();var b=trades.createRequest(p.getId(),user("b").getId()).requestId();
 assertNull(trades.accept(a,owner.getId()).chatRoomId());expire(p);scheduler.expire();
 assertEquals(PostStatus.CLOSED,p.getStatus());assertEquals(2,p.getCurrentParticipantCount());
 assertEquals(TradeRequestStatus.ACCEPTED,requests.findById(a).orElseThrow().getStatus());
 assertEquals(TradeRequestStatus.REJECTED,requests.findById(b).orElseThrow().getStatus());
 var room=rooms.findGroupRoomByPostId(p.getId()).orElseThrow();assertEquals(1,chat.notificationRecipientIds(owner.getId(),room.getId()).size());
 long noteCount=notes.count();scheduler.expire();assertEquals(noteCount,notes.count());assertEquals(1,rooms.count());
 }
 @Test void expiryWithoutAcceptedParticipantsClosesWithoutChat(){
 var owner=user("owner");var p=post(owner,PostType.GROUP_BUY,"expiry",4,37.5);
 var a=trades.createRequest(p.getId(),user("a").getId()).requestId();expire(p);
 trades.closeGroupBuyRecruitment(p.getId(),owner.getId());
 assertEquals(PostStatus.CLOSED,p.getStatus());assertEquals(TradeRequestStatus.REJECTED,requests.findById(a).orElseThrow().getStatus());assertTrue(rooms.findGroupRoomByPostId(p.getId()).isEmpty());
 }
 @Test void groupRecipientsIncludeEveryoneExceptSenderMutedAndDeparted(){
 var owner=user("owner");var a=user("a");var b=user("b");var c=user("c");var p=post(owner,PostType.GROUP_BUY,"chat",5,37.5);
 for(var u:List.of(a,b,c))trades.createRequest(p.getId(),u.getId());
 Long room=trades.closeGroupBuyRecruitment(p.getId(),owner.getId()).get(0).chatRoomId();
 assertEquals(Set.of(a.getId(),b.getId(),c.getId()),new HashSet<>(chat.notificationRecipientIds(owner.getId(),room)));
 chat.leaveRoom(b.getId(),room);
 assertEquals(Set.of(owner.getId(),c.getId()),new HashSet<>(chat.notificationRecipientIds(a.getId(),room)));
 }
 @Test void databasePaginationFiltersBeforeCountingAndOrdersByDistance(){
 var u=user("owner");for(int i=0;i<25;i++)post(u,PostType.SHARE,"visible"+i,0,37.5+i*0.001);
 post(u,PostType.GROUP_BUY,"group",3,37.5);var far=post(u,PostType.SHARE,"far",0,39);
 var hidden=post(u,PostType.SHARE,"hidden",0,37.5);em.persist(new com.hjs.foodshare.demo.DemoPost(hidden.getId()));
 var expired=post(u,PostType.SHARE,"expired",0,37.5);ReflectionTestUtils.setField(expired,"expirationDate",LocalDate.now().minusDays(1));em.flush();
 var first=market.searchPostsPage(null,null,5.0,37.5,127.0,false,PostSort.DISTANCE,null,0,10,true);
 var second=market.searchPostsPage(null,null,5.0,37.5,127.0,false,PostSort.DISTANCE,null,1,10,true);
 assertEquals(25,first.totalElements());assertEquals(10,first.content().size());assertTrue(first.content().get(0).distanceKm()<=0.1); // Public locations share a coarse grid; ties use creation order.
 assertTrue(first.content().stream().noneMatch(a->second.content().stream().anyMatch(b->a.postId().equals(b.postId()))));
 var last=market.searchPostsPage(null,null,5.0,37.5,127.0,false,PostSort.DISTANCE,null,2,10,true);assertTrue(last.last());assertEquals(5,last.content().size());
 }
 @Test void databasePagingSupportsAllSortsAndExtremePageNumbers(){
 var u=user("owner");post(u,PostType.SHARE,"one",0,37.5);post(u,PostType.GROUP_BUY,"group",3,37.51);
 for(var sort:PostSort.values())assertEquals(2,market.searchPostsPage(null,null,null,37.5,127.0,false,sort,null,0,20).totalElements());
 assertTrue(market.searchPostsPage(null,null,null,null,null,false,PostSort.LATEST,null,Integer.MAX_VALUE,100).content().isEmpty());
 }
}
