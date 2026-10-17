package com.hjs.foodshare.notification.service;
import jakarta.persistence.*;
import com.hjs.foodshare.notification.domain.UserFcmToken;
import com.hjs.foodshare.user.domain.User;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.Instant;
import java.util.List;

@Service
public class PushRetryService {
 @PersistenceContext private EntityManager em;
 private final FcmPushService push;
 private final TransactionTemplate tx;
 public PushRetryService(FcmPushService push,PlatformTransactionManager manager){this.push=push;tx=new TransactionTemplate(manager);}
 public void enqueue(Long user,Long token,String type,String title,String body,String target,Long targetId){em.persist(new PushRetry(user,token,type,title,body,target,targetId));}
 @Scheduled(fixedDelay=30000,initialDelay=60000)
 public void tick(){
  List<Long> ids=tx.execute(s->em.createQuery("select p.id from PushRetry p where p.dueAt<=:now order by p.id",Long.class).setParameter("now",Instant.now()).setMaxResults(100).getResultList());
  if(ids==null)return;
  for(Long id:ids)try{tx.executeWithoutResult(s->deliver(id));}catch(RuntimeException e){org.slf4j.LoggerFactory.getLogger(getClass()).warn("Push retry transaction failed for job {}",id);}
 }
 public void deliver(Long id){
  var job=em.find(PushRetry.class,id,LockModeType.PESSIMISTIC_WRITE);
  if(job==null||job.dueAt.isAfter(Instant.now()))return;
  var token=em.find(UserFcmToken.class,job.tokenId);
  var user=em.find(User.class,job.userId);
  if(token==null||user==null||!token.getUser().getId().equals(job.userId)||!allowed(user,job.type)||Instant.now().isAfter(job.expiresAt)){em.remove(job);return;}
  var result=push.sendPush(token.getToken(),job.title,job.body,NotificationService.pushData(job.type,job.targetType,job.targetId));
  job.attempts++;
  if(result==FcmPushService.SendResult.INVALID_TOKEN)em.remove(token);
  if(result!=FcmPushService.SendResult.FAILED||job.attempts>=5){em.remove(job);return;}
  job.dueAt=Instant.now().plusSeconds(60L*(1L<<job.attempts));
 }
 private boolean allowed(User user,String type){
  if("CHAT_MESSAGE".equals(type))return user.isChatPushEnabled();
  if("SHOPPING_REMINDER".equals(type))return em.createQuery("select count(p) from ShoppingPreference p where p.userId=:id and p.reminderEnabled=true",Long.class).setParameter("id",user.getId()).getSingleResult()>0;
  if("TRADE_REQUEST".equals(type))return user.isNotificationTradeRequest();
  if("TRADE_ACCEPTED".equals(type)||"FRIDGE_EXCHANGE".equals(type))return user.isNotificationTradeAccepted();
  return true;
 }
}
