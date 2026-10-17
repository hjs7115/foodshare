package com.hjs.foodshare.auth.service;
import com.hjs.foodshare.global.exception.BusinessException;
import jakarta.persistence.*;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Locale;

@Service
public class AuthThrottle {
 @PersistenceContext private EntityManager em;
 private final TransactionTemplate tx;
 public AuthThrottle(PlatformTransactionManager manager){tx=new TransactionTemplate(manager);tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);}
 // Commit counters independently of the rejected authentication transaction. The server runs one backend instance.
 public synchronized void check(String action,String identity,int limit,int seconds){
  String id=key(action+":"+identity.strip().toLowerCase(Locale.ROOT));
  boolean allowed=Boolean.TRUE.equals(tx.execute(status->{
   Instant now=Instant.now();
   var row=em.find(AuthAttempt.class,id,LockModeType.PESSIMISTIC_WRITE);
   if(row==null){row=new AuthAttempt(id,now.plusSeconds(seconds));em.persist(row);}
   else if(!row.expiresAt.isAfter(now)){row.attempts=0;row.expiresAt=now.plusSeconds(seconds);}
   if(row.attempts>=limit)return false;
   row.attempts++;return true;
  }));
  if(!allowed)throw new BusinessException(HttpStatus.TOO_MANY_REQUESTS,"시도가 너무 많아요. 잠시 후 다시 시도해주세요.");
 }
 @org.springframework.scheduling.annotation.Scheduled(fixedDelay=3600000)
 public synchronized void clean(){tx.executeWithoutResult(s->em.createQuery("delete from AuthAttempt a where a.expiresAt < :cutoff").setParameter("cutoff",Instant.now().minusSeconds(86400)).executeUpdate());}
 private String key(String s){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
}
