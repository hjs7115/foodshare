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
 @org.springframework.beans.factory.annotation.Autowired private DemoSafetyService safety;
 public record Status(boolean canManage, boolean enabled, boolean canReset) {}
 public boolean enabled(){var state=em.find(DemoState.class,1L);return state!=null && state.isEnabled();}
 public boolean canManage(Long userId){return userId!=null && em.find(DemoManager.class,userId)!=null;}
 public boolean canReset(Long userId){
  if(!canManage(userId))return false;
  var account=em.find(com.hjs.foodshare.user.domain.User.class,userId);
  if(account==null || !account.isAvailable())return false;
  String nickname=account.getNickname();
  return "새파란".equals(nickname) || "메로".equals(nickname);
 }
 public void requireResetPermission(Long userId){
  if(!canReset(userId))throw new BusinessException(HttpStatus.FORBIDDEN,"시뮬레이션 초기화 권한이 없습니다.");
 }
 public Status status(Long userId){
  return new Status(canManage(userId),enabled(),canReset(userId));
 }
 public Set<Long> hiddenPostIds(){
  var ids=new HashSet<>(em.createQuery("select s.privatePostId from DemoSession s",Long.class).getResultList());
  if(!enabled())ids.addAll(em.createQuery("select p.postId from DemoPost p",Long.class).getResultList());
  return ids;
 }
 public boolean isTemplate(Long id){return em.find(DemoPost.class,id)!=null;}
 public boolean isDemoWriter(Long userId) {
  if(userId==null || !enabled())return false;
  return !em.createQuery("select d.postId from DemoPost d, Post p where p.id=d.postId and p.writer.id=:user",Long.class)
    .setParameter("user",userId).setMaxResults(1).getResultList().isEmpty();
 }
 public Set<Long> demoWriterIds(){
  if(!enabled())return Set.of();
  return new HashSet<>(em.createQuery("select distinct p.writer.id from DemoPost d, Post p where p.id=d.postId",Long.class).getResultList());
 }
 public boolean isPrivatePost(Long postId){
  return !em.createQuery("select s.requestId from DemoSession s where s.privatePostId=:post",Long.class)
    .setParameter("post",postId).setMaxResults(1).getResultList().isEmpty();
 }
 public boolean isSimulation(Long id){
  if(id==null)return false;
  if(em.find(DemoSession.class,id)!=null)return true;
  if(!em.createQuery("select j.postId from DemoGroupCompanion j where j.requestId=:request",Long.class).setParameter("request",id).getResultList().isEmpty())return true;
  return !em.createQuery("select j.postId from DemoInboundJob j where j.requestId=:request",Long.class)
    .setParameter("request",id).setMaxResults(1).getResultList().isEmpty();
 }
 /** Group rooms may be anchored to a real participant's request rather than the AI request. */
 public boolean isSimulationChat(Long postId,Long humanId){
  long outbound=em.createQuery("select count(s) from DemoSession s where s.privatePostId=:post and s.reset=false and (:human is null or s.userId=:human)",Long.class)
    .setParameter("post",postId).setParameter("human",humanId).getSingleResult();
  if(outbound>0)return true;
  if(em.createQuery("select count(j) from DemoGroupCompanion j where j.postId=:post and j.requestId is not null and j.reset=false and (:human is null or j.humanId=:human)",Long.class).setParameter("post",postId).setParameter("human",humanId).getSingleResult()>0)return true;
  return em.createQuery("select count(j) from DemoInboundJob j where j.postId=:post and j.requestId is not null and coalesce(j.reset,false)=false and (:human is null or j.writerId=:human)",Long.class)
    .setParameter("post",postId).setParameter("human",humanId).getSingleResult()>0;
 }
 public void rememberScore(com.hjs.foodshare.user.domain.User target,Long requestId){
  if(!isSimulation(requestId)||em.find(DemoScore.class,target.getId())!=null)return;
  long last=em.createQuery("select coalesce(max(r.id),0) from Review r",Long.class).getSingleResult();
  em.persist(new DemoScore(target.getId(),target.getFreshnessScore(),last));
 }
 public com.hjs.foodshare.post.domain.Post prepare(com.hjs.foodshare.post.domain.Post source,Long userId){
  if(!em.createQuery("select s.requestId from DemoSession s where s.privatePostId=:id",Long.class).setParameter("id",source.getId()).getResultList().isEmpty())
   throw new BusinessException(HttpStatus.BAD_REQUEST,"시연 원본 게시글에서 요청해주세요.");
  if(!isTemplate(source.getId()))return source;
  if(enabled())safety.require(userId,DemoSafetyService.Activity.REQUEST);
  // The original post lock serializes duplicate requests without changing the template.
  em.refresh(source,LockModeType.PESSIMISTIC_WRITE);
  if(em.createQuery("select count(s) from DemoSession s where s.userId=:user and s.sourcePostId=:post and s.reset=false",Long.class)
    .setParameter("user",userId).setParameter("post",source.getId()).getSingleResult()>0)
   throw new BusinessException(HttpStatus.CONFLICT,"이미 체험한 글입니다. 설정에서 시뮬레이션을 초기화하면 다시 체험할 수 있어요.");
  boolean group=source.getPostType()==com.hjs.foodshare.post.domain.PostType.GROUP_BUY;
  var copy=com.hjs.foodshare.post.domain.Post.create(source.getWriter(),source.getPostType(),source.getTitle().substring(0,Math.min(100,source.getTitle().length())),source.getIngredientName(),source.getQuantity(),source.getPrice(),source.getTradeLocation(),source.getDistanceKm(),java.time.LocalDate.now().plusDays(1),source.getLatitude(),source.getLongitude(),source.getImageUrl(),source.getContent(),group?1:null,group?Math.min(3,Math.max(2,source.getTargetParticipantCount())):null,group?java.time.LocalDateTime.now().plusDays(1):null);
  copy.setPriceNegotiable(source.isPriceNegotiable());em.persist(copy);return copy;
 }
 public void register(com.hjs.foodshare.trade.domain.TradeRequest request,Long sourceId){
  if(!request.getPost().getId().equals(sourceId))em.persist(new DemoSession(request.getId(),request.getRequester().getId(),sourceId,request.getPost().getId()));
 }
 public Long requestPost(Long userId,Long source){
  return em.createQuery("select s.privatePostId from DemoSession s where s.userId=:user and s.sourcePostId=:source and s.reset=false",Long.class).setParameter("user",userId).setParameter("source",source).getResultStream().findFirst().orElse(source);
 }
 public void requireVisible(Long postId){
  if(em.find(DemoPost.class,postId)!=null && !enabled())throw new BusinessException(HttpStatus.NOT_FOUND,"Post not found.");
 }
 @Transactional public Status setEnabled(Long userId, boolean enabled){
  if(!canManage(userId))throw new BusinessException(HttpStatus.FORBIDDEN,"시연 모드 변경 권한이 없습니다.");
  var state=em.find(DemoState.class,1L,LockModeType.PESSIMISTIC_WRITE);
  if(state==null)throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE,"시연 모드 초기화가 필요합니다.");
  state.setEnabled(enabled);
  return status(userId);
 }
}
