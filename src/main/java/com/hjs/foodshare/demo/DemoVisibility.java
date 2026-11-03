package com.hjs.foodshare.demo;
import jakarta.persistence.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import com.hjs.foodshare.global.exception.BusinessException;
@Service @Transactional(readOnly=true)
public class DemoVisibility {
 @PersistenceContext private EntityManager em;
 public record Status(boolean canManage, boolean enabled) {}
 public boolean enabled(){var state=em.find(DemoState.class,1L);return state!=null && state.isEnabled();}
 public boolean canManage(Long userId){return userId!=null && em.find(DemoManager.class,userId)!=null;}
 public Status status(Long userId){boolean manager=canManage(userId);return new Status(manager,manager && enabled());}
 public Set<Long> hiddenPostIds(){return enabled()?Set.of():new HashSet<>(em.createQuery("select p.postId from DemoPost p",Long.class).getResultList());}
 public void requireVisible(Long postId){
  if(em.find(DemoPost.class,postId)!=null && !enabled())throw new BusinessException(HttpStatus.NOT_FOUND,"Post not found.");
 }
 @Transactional public Status setEnabled(Long userId, boolean enabled){
  if(!canManage(userId))throw new BusinessException(HttpStatus.FORBIDDEN,"시연 모드 변경 권한이 없습니다.");
  var state=em.find(DemoState.class,1L,LockModeType.PESSIMISTIC_WRITE);
  if(state==null)throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE,"시연 모드 초기화가 필요합니다.");
  state.setEnabled(enabled);
  return new Status(true,enabled);
 }
}
