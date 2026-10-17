package com.hjs.foodshare.fridge.open;
import com.hjs.foodshare.fridge.domain.FridgeItem;
import com.hjs.foodshare.fridge.repository.FridgeItemRepository;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import com.hjs.foodshare.post.domain.*;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.trade.domain.TradeRequestStatus;
import com.hjs.foodshare.trade.repository.TradeRequestRepository;
import com.hjs.foodshare.trade.service.TradeRequestService;
import com.hjs.foodshare.trade.dto.TradeRequestResponse;
import com.hjs.foodshare.moderation.repository.UserBlockRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
@Service @Transactional(readOnly=true)
public class OpenFridgeService {
 @org.springframework.beans.factory.annotation.Autowired private com.hjs.foodshare.upload.service.ImageUploadService images;
 @org.springframework.beans.factory.annotation.Autowired private com.hjs.foodshare.fridge.exchange.FridgeExchangeRepository exchanges;
 private final FridgeItemRepository items; private final UserRepository users; private final PostRepository posts;
 private final TradeRequestRepository requests; private final TradeRequestService trades; private final UserBlockRepository blocks;
 @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager em;
 public OpenFridgeService(FridgeItemRepository items,UserRepository users,PostRepository posts,TradeRequestRepository requests,TradeRequestService trades,UserBlockRepository blocks){this.items=items;this.users=users;this.posts=posts;this.requests=requests;this.trades=trades;this.blocks=blocks;}
 public record SharedItem(Long itemId,Long postId,String name,String amount,LocalDate expiryDate,LocalDateTime confirmedAt,String state,boolean requested,String imageUrl){}
 public record Neighbor(Long userId,String nickname,String profileImage,String neighborhood,double distanceKm,List<SharedItem> items){}
 public record Nearby(boolean locationRequired,List<Neighbor> neighbors){}
 private LocalDateTime now(){return LocalDateTime.now(ZoneId.of("Asia/Seoul"));}
 private User user(Long id){return users.findById(id).orElseThrow(()->new BusinessException(HttpStatus.NOT_FOUND,"사용자를 찾지 못했어요."));}
 private boolean located(User u){return u.getLatitude()!=null&&u.getLongitude()!=null&&Math.abs(u.getLatitude())<=90&&Math.abs(u.getLongitude())<=180;}
 public List<SharedItem> mine(Long id){return items.findAllByUserIdOrderByExpiryDateAscCreatedAtAsc(id).stream().map(this::view).toList();}
 private SharedItem view(FridgeItem f){Post p=f.getSharedPost();String state=p==null?"PRIVATE":f.getShareConfirmedAt()==null?"PRIVATE":p.isDeleted()?"ENDED":p.getStatus()==PostStatus.CLOSED?"ENDED":!available(f)?"STALE":"PUBLIC";return new SharedItem(f.getId(),p==null?null:p.getId(),f.getName(),p==null?f.getAmount():p.getQuantity(),f.getExpiryDate(),f.getShareConfirmedAt(),state,false,f.getImageUrl());}
 private boolean available(FridgeItem f){return f.getSharedPost()!=null&&f.getSharedPost().isOpen()&&f.getShareConfirmedAt()!=null&&!f.getShareConfirmedAt().isBefore(now().minusDays(7))&&!f.getExpiryDate().isBefore(now().toLocalDate());}
 private boolean blocked(Long a,Long b){return blocks.existsByBlockerIdAndBlockedUserId(a,b)||blocks.existsByBlockerIdAndBlockedUserId(b,a);}
 private String area(User u){String v=u.getLocation();if(v==null||v.isBlank())return "동네 미정";return String.join(" ",Arrays.stream(v.trim().split("\\s+")).limit(2).toList());}
 private double distance(User a,User b){double x=Math.toRadians(b.getLatitude()-a.getLatitude()),y=Math.toRadians(b.getLongitude()-a.getLongitude());double h=Math.sin(x/2)*Math.sin(x/2)+Math.cos(Math.toRadians(a.getLatitude()))*Math.cos(Math.toRadians(b.getLatitude()))*Math.sin(y/2)*Math.sin(y/2);return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));}
 public Nearby nearby(Long id,String keyword){User me=user(id);if(!located(me))return new Nearby(true,List.of());String key=keyword==null?"":keyword.strip().toLowerCase(Locale.ROOT);if(key.length()>50)throw new BusinessException(HttpStatus.BAD_REQUEST,"검색어는 50자 이내로 입력해주세요.");
  double lng=5/(111*Math.max(0.01,Math.cos(Math.toRadians(me.getLatitude()))));
  // Filter permissions and availability in SQL before applying the bounded nearest-first window.
  String distanceSql="6371*2*asin(sqrt(least(1.0,power(sin((u.latitude-:lat)*0.017453292519943295/2),2)+cos(:lat*0.017453292519943295)*cos(u.latitude*0.017453292519943295)*power(sin((u.longitude-:lng)*0.017453292519943295/2),2))))";
  var found=em.createQuery("select f from FridgeItem f join fetch f.user u join fetch f.sharedPost p where u.id<>:me and f.shareConfirmedAt>=:since and f.expiryDate>=:today and p.deleted=false and p.status=com.hjs.foodshare.post.domain.PostStatus.OPEN and p.openFridgeValidUntil>:now and u.latitude between :minLat and :maxLat and u.longitude between :minLng and :maxLng and locate(:key,lower(f.name))>0 and not exists(select b.id from UserBlock b where (b.blocker.id=:me and b.blockedUser.id=u.id) or (b.blocker.id=u.id and b.blockedUser.id=:me)) and "+distanceSql+"<=5 order by "+distanceSql+",f.shareConfirmedAt desc",FridgeItem.class)
   .setParameter("me",id).setParameter("since",now().minusDays(7)).setParameter("today",now().toLocalDate()).setParameter("now",now()).setParameter("lat",me.getLatitude()).setParameter("lng",me.getLongitude()).setParameter("minLat",me.getLatitude()-0.046).setParameter("maxLat",me.getLatitude()+0.046).setParameter("minLng",me.getLongitude()-lng).setParameter("maxLng",me.getLongitude()+lng).setParameter("key",key).setMaxResults(500).getResultList();
  Map<Long,List<FridgeItem>> grouped=new LinkedHashMap<>();
  found.forEach(f->grouped.computeIfAbsent(f.getUser().getId(),k->new ArrayList<>()).add(f));
  Set<Long> requested=found.isEmpty()?Set.of():new HashSet<>(em.createQuery("select distinct t.post.id from TradeRequest t where t.requester.id=:id and t.post.id in :posts",Long.class).setParameter("id",id).setParameter("posts",found.stream().map(f->f.getSharedPost().getId()).toList()).getResultList());
  List<Neighbor> result=new ArrayList<>();for(var entry:grouped.entrySet()){User owner=entry.getValue().getFirst().getUser();double d=distance(me,owner);result.add(new Neighbor(owner.getId(),owner.getNickname(),owner.getProfileImage(),area(owner),Math.round(d*10)/10.0,entry.getValue().stream().map(f->{var v=view(f);return new SharedItem(v.itemId(),v.postId(),v.name(),v.amount(),v.expiryDate(),v.confirmedAt(),v.state(),requested.contains(v.postId()),v.imageUrl());}).toList()));}
  return new Nearby(false,result.stream().sorted(Comparator.comparingDouble(Neighbor::distanceKm)).limit(50).toList());
 }
 @Transactional public SharedItem publish(Long id,Long itemId,String amount){
  var f=items.lockOwned(itemId,id).orElseThrow(()->new BusinessException(HttpStatus.NOT_FOUND,"내 냉장고 재료를 찾지 못했어요."));User me=f.getUser();
  if(!located(me))throw new BusinessException(HttpStatus.BAD_REQUEST,"내 위치를 먼저 설정해주세요.");
  if(f.getExpiryDate().isBefore(now().toLocalDate()))throw new BusinessException(HttpStatus.BAD_REQUEST,"기한이 지난 재료는 공개할 수 없어요.");
  Post p=f.getSharedPost();
  if(p!=null){em.flush();em.refresh(p,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
   if(exchanges.reserved(p.getId())||!requests.findAllByPostIdAndStatus(p.getId(),TradeRequestStatus.ACCEPTED).isEmpty()||!requests.findAllByPostIdAndStatus(p.getId(),TradeRequestStatus.COMPLETED).isEmpty())throw new BusinessException(HttpStatus.CONFLICT,"이미 거래 중이거나 완료된 재료예요. 남은 재료를 확인한 뒤 새로 등록해주세요.");
   if(available(f)&&p.getQuantity().equals(amount)){f.share(p);p.setOpenFridgeValidUntil(until(f));return view(f);}
   p.close();requests.findAllByPostIdAndStatus(p.getId(),TradeRequestStatus.PENDING).forEach(r->r.reject());
  }
  String title=f.getName().substring(0,Math.min(90,f.getName().length()))+" 나눔해요";
  p=posts.save(Post.create(me,PostType.SHARE,title,f.getName(),amount,0,area(me),0.0,f.getExpiryDate(),Math.round(me.getLatitude()*100)/100.0,Math.round(me.getLongitude()*100)/100.0,f.getImageUrl(),"열린 냉장고에서 나누는 재료예요. 나눌 수량: "+amount+". 보관 상태와 만날 장소는 수락 후 채팅으로 확인해주세요.",null,null,null));
  p.setOpenFridgeValidUntil(until(f));f.share(p);return view(f);
 }
 @Transactional public SharedItem photo(Long id,Long itemId,String imageUrl){
  var f=items.lockOwned(itemId,id).orElseThrow(()->new BusinessException(HttpStatus.NOT_FOUND,"내 재료를 찾지 못했어요."));
  images.requireOwned(imageUrl,id,f.getImageUrl());f.setImageUrl(imageUrl);
  if(f.getSharedPost()!=null){em.flush();em.refresh(f.getSharedPost(),jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);f.getSharedPost().updateOpenFridgeImage(imageUrl);}
  return view(f);
 }
 private LocalDateTime until(FridgeItem f){LocalDateTime a=now().plusDays(7),b=f.getExpiryDate().plusDays(1).atStartOfDay();return a.isBefore(b)?a:b;}
 @Transactional public void hide(Long id,Long itemId){var f=items.lockOwned(itemId,id).orElseThrow(()->new BusinessException(HttpStatus.NOT_FOUND,"재료를 찾지 못했어요."));if(f.getSharedPost()!=null){em.flush();em.refresh(f.getSharedPost(),jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);requests.findAllByPostIdAndStatus(f.getSharedPost().getId(),TradeRequestStatus.PENDING).forEach(r->r.reject());}f.hideShare();}
 @Transactional public TradeRequestResponse request(Long id,Long itemId){var f=items.findById(itemId).orElseThrow(()->new BusinessException(HttpStatus.NOT_FOUND,"공개 재료를 찾지 못했어요."));if(!available(f))throw new BusinessException(HttpStatus.CONFLICT,"공개가 종료됐어요. 목록을 새로고침해주세요.");User me=user(id);if(!located(me)||!located(f.getUser())||distance(me,f.getUser())>5)throw new BusinessException(HttpStatus.BAD_REQUEST,"내 위치를 확인해주세요. 5km 이내 이웃에게 요청할 수 있어요.");if(blocked(id,f.getUser().getId()))throw new BusinessException(HttpStatus.FORBIDDEN,"요청할 수 없는 사용자예요.");return trades.createRequest(f.getSharedPost().getId(),id);}
}
