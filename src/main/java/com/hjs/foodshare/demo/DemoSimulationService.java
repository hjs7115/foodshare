package com.hjs.foodshare.demo;

import com.hjs.foodshare.chat.domain.*;
import com.hjs.foodshare.chat.service.ChatService;
import com.hjs.foodshare.chat.websocket.ChatWebSocketHandler;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.review.domain.Review;
import com.hjs.foodshare.review.dto.ReviewCreateRequest;
import com.hjs.foodshare.review.service.*;
import com.hjs.foodshare.trade.domain.*;
import com.hjs.foodshare.trade.service.TradeRequestService;
import com.hjs.foodshare.user.domain.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.*;

@Service
public class DemoSimulationService {
 @PersistenceContext private EntityManager em;
 private final DemoVisibility demo;
 private final TradeRequestService trades;
 private final ChatService chats;
 private final ReviewService reviews;
 private final ChatWebSocketHandler live;
 private final DemoChatAi ai;
 private final TransactionTemplate tx;
 public DemoSimulationService(DemoVisibility demo,TradeRequestService trades,ChatService chats,ReviewService reviews,ChatWebSocketHandler live,DemoChatAi ai,PlatformTransactionManager manager){
  this.demo=demo;this.trades=trades;this.chats=chats;this.reviews=reviews;this.live=live;this.ai=ai;this.tx=new TransactionTemplate(manager);
 }
 public List<Long> due(){return tx.execute(s -> !demo.enabled()?List.of():em.createQuery("select s.requestId from DemoSession s where s.reset=false and s.finished=false and s.dueAt<=:now order by s.dueAt,s.requestId",Long.class).setParameter("now",LocalDateTime.now()).setMaxResults(100).getResultList());}
 private TradeRequest lock(Long id){
  var r=em.find(TradeRequest.class,id);if(r==null)return null;
  em.refresh(r.getPost(),LockModeType.PESSIMISTIC_WRITE);em.refresh(r,LockModeType.PESSIMISTIC_WRITE);return r;
 }
 private DemoSession session(Long id){return em.find(DemoSession.class,id,LockModeType.PESSIMISTIC_WRITE);}
 private void send(DemoSession s,TradeRequest r,String text,String clientId){
  var saved=chats.sendAutomatedMessage(r.getPost().getWriter().getId(),s.roomId,text,clientId);
  Long actor=r.getPost().getWriter().getId();
  TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCommit(){live.publishSavedMessage(actor,saved);}});
 }
 record Prompt(Long requestId,long through,String text,boolean review){}
 public void advance(Long id){
  Prompt prompt=prepareNext(id);
  if(prompt!=null)respond(prompt);
 }
 Prompt prepareNext(Long id){return tx.execute(status -> prepare(id));}
 void respond(Prompt prompt){
  Long id=prompt.requestId();
  // The external AI call is deliberately outside the transaction and any DB lock.
  if(prompt.review()){
   var draft=ai.review(prompt.text());
   if(draft==null)draft=new DemoChatAi.ReviewDraft(4,"대화가 원활해서 편하게 거래를 진행할 수 있었어요.");
   final var review=draft;
   tx.executeWithoutResult(status -> {
    var r=lock(id);var s=session(id);
    if(r==null||s==null||s.reset||s.finished||!demo.enabled()||r.getStatus()!=TradeRequestStatus.COMPLETED)return;
    Long actor=r.getPost().getWriter().getId();
    if(em.createQuery("select count(v) from Review v where v.tradeRequest.id=:id and v.reviewer.id=:actor",Long.class)
         .setParameter("id",id).setParameter("actor",actor).getSingleResult()==0)
       reviews.createReview(id,actor,new ReviewCreateRequest(review.rating(),review.content()));
    send(s,r,"감사합니다! 좋은 하루 보내세요 :)","demo-complete-"+id);
    s.finished=true;
   });
   return;
  }
  String answer=ai.reply(prompt.text());
  tx.executeWithoutResult(status -> {
   var r=lock(id);var s=session(id);
   if(r==null||s==null||s.reset||s.finished||!demo.enabled()||r.getStatus()!=TradeRequestStatus.ACCEPTED||s.repliedThrough>=prompt.through())return;
   send(s,r,answer,"demo-reply-"+prompt.through());s.repliedThrough=prompt.through();s.replyCount++;s.dueAt=LocalDateTime.now().plusSeconds(2);
  });
 }
 private Prompt prepare(Long id){
  var r=lock(id);var s=session(id);
  if(r==null||s==null||s.reset||s.finished||!demo.enabled()||s.dueAt.isAfter(LocalDateTime.now()))return null;
  if(r.getStatus()==TradeRequestStatus.CANCELLED||r.getStatus()==TradeRequestStatus.REJECTED){s.finished=true;return null;}
  if(r.getStatus()==TradeRequestStatus.PENDING){
   trades.accept(id,r.getPost().getWriter().getId());
   s.roomId=chats.findRoomIdByTradeRequestId(id);
   // The participant starts the conversation; do not send an unsolicited greeting.
  }
  if(r.getStatus()==TradeRequestStatus.ACCEPTED && r.getRequesterConfirmedAt()!=null){
   trades.complete(id,r.getPost().getWriter().getId());
  }
  if(r.getStatus()==TradeRequestStatus.COMPLETED){
   Long actor=r.getPost().getWriter().getId();
   long existing=em.createQuery("select count(v) from Review v where v.tradeRequest.id=:id and v.reviewer.id=:actor",Long.class)
       .setParameter("id",id).setParameter("actor",actor).getSingleResult();
   if(existing>0){s.finished=true;return null;}
   s.dueAt=LocalDateTime.now().plusSeconds(30);
   return new Prompt(id,0L,DemoReviewContext.from(em,r,s.roomId,actor),true);
  }
  s.dueAt=LocalDateTime.now().plusSeconds(2);
  if(r.getStatus()!=TradeRequestStatus.ACCEPTED||s.roomId==null)return null;
  var history=em.createQuery("select m from ChatMessage m left join fetch m.sender where m.chatRoom.id=:room and m.systemMessage=false order by m.id desc",ChatMessage.class).setParameter("room",s.roomId).setMaxResults(16).getResultList();
  long latest=history.stream().filter(m->m.getSender()!=null&&m.getSender().getId().equals(s.userId)).mapToLong(ChatMessage::getId).max().orElse(0);
  if(latest<=s.repliedThrough)return null;
  long daily=em.createQuery("select coalesce(sum(d.replyCount),0) from DemoSession d, TradeRequest t where d.requestId=t.id and d.userId=:user and t.createdAt>=:today",Long.class).setParameter("user",s.userId).setParameter("today",java.time.LocalDate.now().atStartOfDay()).getSingleResult();
  if(s.replyCount>=30 || daily>=100){send(s,r,"오늘은 메시지를 더 보내기 어려울 것 같아요. 거래 완료는 화면에서 진행해주세요.","demo-limit-"+latest);s.repliedThrough=latest;return null;}
  chats.markAsRead(r.getPost().getWriter().getId(),s.roomId);
  StringBuilder context=new StringBuilder("역할: 당신은 게시글 작성자(나눔 제공자 또는 판매자)이며, 상대는 거래 요청자입니다. 상대의 문의에 답하세요.\n거래 상품: ").append(r.getPost().getTitle()).append(" / 수량: ").append(r.getPost().getQuantity()).append(" / 가격: ").append(r.getPost().getPrice()).append(" / 거래 종류: ").append(r.getPost().getPostType()).append(" / 장소: ").append(r.getPost().getTradeLocation()).append("\n최근 대화:\n");
  var ordered=new ArrayList<>(history);Collections.reverse(ordered);
  ordered.forEach(m->context.append(m.getSender().getId().equals(s.userId)?"요청자: ":"게시글 작성자: ").append(m.getContent()).append('\n'));
  return new Prompt(id,latest,context.toString(),false);
 }
 public int resetMine(Long userId){return tx.execute(status -> {
  if(em.find(User.class,userId)==null)throw new BusinessException(HttpStatus.NOT_FOUND,"계정을 찾을 수 없습니다.");
  var ids=em.createQuery("select s.requestId from DemoSession s where s.userId=:user and s.reset=false order by s.requestId",Long.class).setParameter("user",userId).getResultList();
  // Lock trades before users, matching completion/review lock ordering.
  for(Long id:ids)lock(id);
  var targets=new TreeSet<Long>();
  for(Long id:ids){var r=em.find(TradeRequest.class,id);targets.add(userId);targets.add(r.getPost().getWriter().getId());}
  for(Long target:targets)em.refresh(em.find(User.class,target),LockModeType.PESSIMISTIC_WRITE);
  for(Long id:ids){
   var s=session(id);if(s.reset)continue;
   var r=em.find(TradeRequest.class,id);
   var reviewIds=em.createQuery("select v.id from Review v where v.tradeRequest.id=:id",Long.class).setParameter("id",id).getResultList();
   if(!reviewIds.isEmpty())em.createQuery("delete from Notification n where n.targetType='REVIEW' and n.targetId in :ids").setParameter("ids",reviewIds).executeUpdate();
   em.createQuery("delete from Review v where v.tradeRequest.id=:id").setParameter("id",id).executeUpdate();
   em.createQuery("delete from Notification n where n.targetType='TRADE_REQUEST' and n.targetId=:id").setParameter("id",id).executeUpdate();
   if(s.roomId!=null){
    em.createQuery("delete from Notification n where n.targetType='CHAT_ROOM' and n.targetId=:id").setParameter("id",s.roomId).executeUpdate();
    for(var member:em.createQuery("select m from ChatRoomMember m where m.chatRoom.id=:id",ChatRoomMember.class).setParameter("id",s.roomId).getResultList()){member.leave();member.markAsRead();member.hideFromChatList();}
   }
   r.cancel(userId,"시뮬레이션 초기화");r.hideHistoryFor(userId);r.hideHistoryFor(r.getPost().getWriter().getId());r.getPost().delete();s.reset=true;s.finished=true;
  }
  em.flush();
  for(Long target:targets){
   var base=em.find(DemoScore.class,target);if(base==null)continue;
   double score=base.score;
   for(var rating:em.createQuery("select v.rating from Review v where v.targetUser.id=:user and v.id>:after order by v.id",Integer.class).setParameter("user",target).setParameter("after",base.afterReviewId).getResultList())score=FreshnessCalculator.update(score,rating);
   em.find(User.class,target).updateFreshnessScore(score);
  }
  return ids.size();
 });}
}
