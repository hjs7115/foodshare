package com.hjs.foodshare.demo;

import com.hjs.foodshare.chat.domain.ChatMessage;
import com.hjs.foodshare.chat.service.ChatService;
import com.hjs.foodshare.chat.websocket.ChatWebSocketHandler;
import com.hjs.foodshare.post.domain.*;
import com.hjs.foodshare.trade.domain.*;
import com.hjs.foodshare.trade.service.TradeRequestService;
import com.hjs.foodshare.review.service.ReviewService;
import com.hjs.foodshare.review.dto.ReviewCreateRequest;
import com.hjs.foodshare.user.domain.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.*;

@Service
public class DemoGroupCompanionService {
 @PersistenceContext private EntityManager em;
 private final DemoVisibility demo;
 private final DemoSafetyService safety;
 private final TradeRequestService trades;
 private final ChatService chats;
 private final ChatWebSocketHandler live;
 private final DemoChatAi ai;
 private final ReviewService reviews;
 private final TransactionTemplate tx;
 public DemoGroupCompanionService(DemoVisibility demo,DemoSafetyService safety,TradeRequestService trades,ChatService chats,ChatWebSocketHandler live,DemoChatAi ai,ReviewService reviews,PlatformTransactionManager manager){
  this.demo=demo;this.safety=safety;this.trades=trades;this.chats=chats;this.live=live;this.ai=ai;this.reviews=reviews;tx=new TransactionTemplate(manager);
 }
 // Called inside the primary simulation transaction, with its post lock held.
 public void schedule(TradeRequest primary,Long human,Long first,boolean outbound){
  var post=primary.getPost();
  if(post.getPostType()!=PostType.GROUP_BUY || post.getTargetParticipantCount()==null || post.getTargetParticipantCount()<3 || em.find(DemoGroupCompanion.class,post.getId())!=null)return;
  var job=new DemoGroupCompanion(post.getId(),human,primary.getId(),first,outbound);
  em.persist(job);
  if(outbound){
   Long actor=chooseActor(job);
   if(actor==null)throw new IllegalStateException("공동구매 시연 참가자 계정이 부족합니다.");
   // The private post cannot be reached through the public request API. Both actors are
   // explicitly selected from registered demo accounts; the human cannot choose one.
   var request=TradeRequest.create(post,em.find(User.class,actor));em.persist(request);em.flush();
   job.requestId=request.getId();trades.accept(request.getId(),post.getWriter().getId());
   job.dueAt=LocalDateTime.now().plusSeconds(2);
  }
 }
 private Long chooseActor(DemoGroupCompanion j){
  for(Long actor:em.createQuery("select distinct p.writer.id from DemoPost d, Post p where d.postId=p.id order by p.writer.id",Long.class).getResultList()){
   if(actor.equals(j.humanId)||actor.equals(j.firstActorId))continue;
   var user=em.find(User.class,actor);if(user==null||!user.isAvailable())continue;
   if(em.createQuery("select count(b) from UserBlock b where (b.blocker.id=:actor and b.blockedUser.id in :others) or (b.blockedUser.id=:actor and b.blocker.id in :others)",Long.class)
    .setParameter("actor",actor).setParameter("others",List.of(j.humanId,j.firstActorId)).getSingleResult()>0)continue;
   if(em.createQuery("select count(t) from TradeRequest t where t.post.id=:post and t.requester.id=:actor",Long.class).setParameter("post",j.postId).setParameter("actor",actor).getSingleResult()>0)continue;
   return actor;
  }
  return null;
 }
 private boolean blocked(Long actor,Long human){
  return em.createQuery("select count(b) from UserBlock b where (b.blocker.id=:actor and b.blockedUser.id=:human) or (b.blockedUser.id=:actor and b.blocker.id=:human)",Long.class).setParameter("actor",actor).setParameter("human",human).getSingleResult()>0;
 }
 public List<Long> due(){return tx.execute(s->!demo.enabled()?List.of():em.createQuery("select j.postId from DemoGroupCompanion j where j.finished=false and j.reset=false and j.dueAt<=:now order by j.dueAt",Long.class).setParameter("now",LocalDateTime.now()).setMaxResults(40).getResultList());}
 private DemoGroupCompanion lock(Long post){
  if(em.find(Post.class,post,LockModeType.PESSIMISTIC_WRITE)==null)return null;
  return em.find(DemoGroupCompanion.class,post,LockModeType.PESSIMISTIC_WRITE);
 }
 public record Prompt(Long postId,Long requestId,long through,boolean greeting,boolean review,String context){}
 public Prompt prepare(Long post){return tx.execute(s->{
  if(!demo.enabled())return null;
  var j=lock(post);if(j==null||j.finished||j.reset||j.dueAt.isAfter(LocalDateTime.now()))return null;
  var p=em.find(Post.class,post);var primary=em.find(TradeRequest.class,j.primaryRequestId);
  if(p.isDeleted()||primary==null||!p.getWriter().isAvailable()||!em.find(User.class,j.humanId).isAvailable()){j.finished=true;return null;}
  if(!safety.canParticipate(j.humanId)){j.dueAt=LocalDateTime.now().plusMinutes(1);return null;}
  if(j.outbound && (primary.getStatus()==TradeRequestStatus.CANCELLED||primary.getStatus()==TradeRequestStatus.REJECTED)){
   if(j.requestId!=null){var other=em.find(TradeRequest.class,j.requestId);if(other.getStatus()==TradeRequestStatus.PENDING||other.getStatus()==TradeRequestStatus.ACCEPTED)other.cancel(j.humanId,"체험 종료");}
   j.finished=true;return null;
  }
  if(j.requestId==null){
   // Count pending requests too: never add a third automated member or overbook
   // slots already requested by real participants.
   long pending=em.createQuery("select count(t) from TradeRequest t where t.post.id=:post and t.status=com.hjs.foodshare.trade.domain.TradeRequestStatus.PENDING",Long.class).setParameter("post",post).getSingleResult();
   if(!p.isOpen()||p.hasPassedDeadline()||p.getCurrentParticipantCount()+pending>=p.getTargetParticipantCount()){j.finished=true;return null;}
   Long actor=chooseActor(j);if(actor==null){j.finished=true;return null;}
   j.requestId=trades.createRequest(post,actor).requestId();j.dueAt=LocalDateTime.now().plusSeconds(2);return null;
  }
  var r=em.find(TradeRequest.class,j.requestId);
  if(r==null||r.getStatus()==TradeRequestStatus.CANCELLED||r.getStatus()==TradeRequestStatus.REJECTED){j.finished=true;return null;}
  if(blocked(r.getRequester().getId(),j.humanId)){j.finished=true;return null;}
  j.dueAt=LocalDateTime.now().plusSeconds(2);
  if(r.getStatus()==TradeRequestStatus.PENDING)return null;
  if(j.outbound && primary.getStatus()==TradeRequestStatus.COMPLETED && r.getStatus()==TradeRequestStatus.ACCEPTED){
   if(r.getWriterConfirmedAt()==null)trades.complete(r.getId(),p.getWriter().getId());
   if(r.getRequesterConfirmedAt()==null)trades.complete(r.getId(),r.getRequester().getId());
  }else if(!j.outbound && r.getStatus()==TradeRequestStatus.ACCEPTED && r.getWriterConfirmedAt()!=null && r.getRequesterConfirmedAt()==null){
   trades.complete(r.getId(),r.getRequester().getId());
  }
  Long room=chats.findRoomIdByTradeRequestId(r.getId());
  if(r.getStatus()==TradeRequestStatus.COMPLETED){
   if(j.outbound){j.finished=true;return null;} // No invented AI-to-AI review or duplicate rating of the human participant.
   long exists=em.createQuery("select count(v) from Review v where v.tradeRequest.id=:id and v.reviewer.id=:actor",Long.class).setParameter("id",r.getId()).setParameter("actor",r.getRequester().getId()).getSingleResult();
   if(exists>0){j.finished=true;return null;}
   j.dueAt=LocalDateTime.now().plusSeconds(45);
   return new Prompt(post,r.getId(),0,false,true,DemoReviewContext.from(em,r,room,r.getRequester().getId()));
  }
  if(room==null)return null;
  if(!j.outbound && j.roomSeenAt==null){j.roomSeenAt=LocalDateTime.now();j.dueAt=j.roomSeenAt.plusSeconds(10);return null;}
  chats.markAsRead(r.getRequester().getId(),room);
  var history=em.createQuery("select m from ChatMessage m join fetch m.sender where m.chatRoom.id=:room and m.systemMessage=false and m.sender.id in :people order by m.id desc",ChatMessage.class)
   .setParameter("room",room).setParameter("people",List.of(j.humanId,j.firstActorId,r.getRequester().getId())).setMaxResults(40).getResultList();
  long latest=history.stream().filter(m->m.getSender().getId().equals(j.humanId)).mapToLong(ChatMessage::getId).max().orElse(0);
  boolean greeting=false;
  if(!j.outbound && !j.greeted){
   var primaryJob=em.find(DemoInboundJob.class,post);
   // A's greeting must be persisted first. If A was rejected, B can greet alone.
   if(primaryJob!=null&&!primaryJob.greeted && primary.getStatus()!=TradeRequestStatus.REJECTED && primary.getStatus()!=TradeRequestStatus.CANCELLED)return null;
   var opened=history.stream().filter(m->m.getSender().getId().equals(j.firstActorId)).findFirst();
   if(opened.isEmpty() && primary.getStatus()==TradeRequestStatus.ACCEPTED)return null;
   if(opened.isPresent() && opened.get().getCreatedAt().isAfter(LocalDateTime.now().minusSeconds(2)))return null;
   greeting=true;
  }else{
   if(latest==0||latest<=j.repliedThrough||j.replyCount>=30)return null;
   boolean firstDone;
   if(j.outbound){var parent=em.find(DemoSession.class,j.primaryRequestId);firstDone=parent!=null&&parent.repliedThrough>=latest;}
   else {var parent=em.find(DemoInboundJob.class,post);firstDone=parent!=null&&parent.repliedThrough>=latest;}
   boolean firstUnavailable=primary.getStatus()==TradeRequestStatus.REJECTED||primary.getStatus()==TradeRequestStatus.CANCELLED;
   if(!firstDone&&!firstUnavailable)return null;
   var firstReply=history.stream().filter(m->m.getSender().getId().equals(j.firstActorId)&&m.getId()>latest).findFirst();
   if(!firstUnavailable && (firstReply.isEmpty()||firstReply.get().getCreatedAt().isAfter(LocalDateTime.now().minusSeconds(2))))return null;
  }
  StringBuilder context=new StringBuilder("역할: 당신은 공동구매의 두 번째 이웃 참가자입니다. 주최자나 첫 번째 이웃을 대신하지 마세요. 앞선 답장을 읽고 내용을 반복하지 말고 짧게 자기 입장에서 이어 말하세요. AI끼리 질문을 주고받지 마세요. 새 장소나 일정이 확인되지 않았다면 지어내지 마세요.\n상품: ").append(p.getTitle()).append("\n가격: ").append(p.getPrice()).append("\n최근 대화:\n");
  var ordered=new ArrayList<>(history);Collections.reverse(ordered);
  for(var m:ordered)context.append(m.getSender().getId().equals(j.humanId)?"사용자":m.getSender().getId().equals(j.firstActorId)?"첫 번째 이웃":"나").append(": ").append(m.getContent()).append('\n');
  j.dueAt=LocalDateTime.now().plusSeconds(45);
  return new Prompt(post,r.getId(),latest,greeting,false,context.toString());
 });}
 public void respond(Prompt prompt){
  var review=prompt.review()?ai.review(prompt.context()):null;
  String answer=prompt.review()?null:prompt.greeting()?ai.firstMessage(prompt.context(),null,"안녕하세요! 저도 같이 구매하려고 참여했어요."):ai.reply(prompt.context());
  if(!prompt.review()&&(answer==null||answer.isBlank()))answer="저도 확인했어요. 함께 일정 맞춰봐요!";
  final String content=answer;
  tx.executeWithoutResult(s->{
   if(!demo.enabled())return;
   var j=lock(prompt.postId());if(j==null||j.finished||j.reset||!Objects.equals(j.requestId,prompt.requestId())||!safety.canParticipate(j.humanId))return;
   var r=em.find(TradeRequest.class,j.requestId);var p=em.find(Post.class,j.postId);
   if(r==null||p.isDeleted()||blocked(r.getRequester().getId(),j.humanId))return;
   var primary=em.find(TradeRequest.class,j.primaryRequestId);
   if(j.outbound && (primary==null||primary.getStatus()==TradeRequestStatus.CANCELLED||primary.getStatus()==TradeRequestStatus.REJECTED))return;
   if(prompt.review()){
    if(r.getStatus()!=TradeRequestStatus.COMPLETED)return;
    long exists=em.createQuery("select count(v) from Review v where v.tradeRequest.id=:id and v.reviewer.id=:actor",Long.class).setParameter("id",r.getId()).setParameter("actor",r.getRequester().getId()).getSingleResult();
    if(exists==0)reviews.createReview(r.getId(),r.getRequester().getId(),new ReviewCreateRequest(review==null?5:review.rating(),review==null?"편하게 일정 맞춰주셔서 감사합니다!":review.content()));
    j.finished=true;return;
   }
   if(r.getStatus()!=TradeRequestStatus.ACCEPTED || (prompt.greeting()?j.greeted:j.repliedThrough>=prompt.through()))return;
   Long room=chats.findRoomIdByTradeRequestId(r.getId());if(room==null)return;
   Long actor=r.getRequester().getId();
   var saved=chats.sendAutomatedMessage(actor,room,content,"group-b-"+j.postId+"-"+(prompt.greeting()?"hello":prompt.through()));
   TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCommit(){live.publishSavedMessage(actor,saved);}});
   if(prompt.greeting())j.greeted=true;else{j.repliedThrough=prompt.through();j.replyCount++;}
   j.dueAt=LocalDateTime.now().plusSeconds(2);
  });
 }
 public void defer(Long post){tx.executeWithoutResult(s->{var j=lock(post);if(j!=null&&!j.finished){j.failures++;j.dueAt=LocalDateTime.now().plusSeconds(Math.min(60,5*j.failures));if(j.failures>=10)j.finished=true;}});}
}
