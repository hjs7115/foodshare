package com.hjs.foodshare.auth.service;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
@Service
public class AuthMaintenance {
 @PersistenceContext private EntityManager em;
 @Scheduled(cron="0 10 4 * * *",zone="Asia/Seoul") @Transactional
 public void clean(){
  em.createQuery("delete from RefreshToken t where t.expiresAt<:cutoff").setParameter("cutoff",LocalDateTime.now().minusDays(7)).executeUpdate();
  em.createQuery("delete from EmailVerification e where e.expiresAt<:cutoff").setParameter("cutoff",LocalDateTime.now().minusDays(7)).executeUpdate();
 }
}
