package com.hjs.foodshare.fridge.exchange;
import com.hjs.foodshare.fridge.repository.FridgeItemRepository;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.moderation.repository.UserBlockRepository;
import com.hjs.foodshare.trade.domain.*;
import com.hjs.foodshare.trade.repository.TradeRequestRepository;
import com.hjs.foodshare.trade.service.TradeRequestService;
import com.hjs.foodshare.chat.service.ChatService;
import com.hjs.foodshare.chat.domain.ChatMessage;
import com.hjs.foodshare.chat.repository.ChatMessageRepository;
import com.hjs.foodshare.notification.service.NotificationService;
import com.hjs.foodshare.global.exception.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import jakarta.persistence.*;
import java.time.*;
import java.util.*;
@Service @Transactional(readOnly=true)
public class FridgeExchangeService {
 private final FridgeExchangeRepository exchanges;private final FridgeItemRepository items;private final PostRepository posts;private final TradeRequestRepository requests;private final TradeRequestService trades;private final ChatService chats;private final ChatMessageRepository messages;private final UserBlockRepository blocks;private final NotificationService notifications;
 @PersistenceContext private EntityManager em;
 public FridgeExchangeService(FridgeExchangeRepository exchanges,FridgeItemRepository items,PostRepository posts,TradeRequestRepository requests,TradeRequestService trades,ChatService chats,ChatMessageRepository messages,UserBlockRepository blocks,NotificationService notifications){this.exchanges=exchanges;this.items=items;this.posts=posts;this.requests=requests;this.trades=trades;this.chats=chats;this.messages=messages;this.blocks=blocks;this.notifications=notifications;}
 public record View(Long id,boolean incoming,String partnerNickname,String offeredName,String offeredAmount,String wantedName,String wantedAmount,String status,Long chatRoomId,LocalDateTime createdAt,boolean cancellationPending,boolean cancellationMine,LocalDateTime meetingAt,String meetingPlace,boolean meetingConfirmed,boolean meetingMine){}
 private BusinessException error(String message){return new BusinessException(HttpStatus.CONFLICT,message);}
 private boolean available(Post p){return p.isOpen()&&items.findBySharedPostId(p.getId()).filter(f->f.getShareConfirmedAt()!=null&&f.getShareConfirmedAt().isAfter(LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusDays(7))&&!f.getExpiryDate().isBefore(LocalDate.now(ZoneId.of("Asia/Seoul")))).isPresent();}
 private boolean blocked(User a,User b){return blocks.existsByBlockerIdAndBlockedUserId(a.getId(),b.getId())||blocks.existsByBlockerIdAndBlockedUserId(b.getId(),a.getId());}
 private void participants(User a,User b){if(a.getId().equals(b.getId()))throw error("내 재료끼리는 교환할 수 없어요.");if(blocked(a,b))throw error("교환할 수 없는 사용자예요.");if(a.getLatitude()==null||a.getLongitude()==null||b.getLatitude()==null||b.getLongitude()==null)throw error("양쪽 모두 위치 설정이 필요해요.");double x=Math.toRadians(a.getLatitude()-b.getLatitude()),y=Math.toRadians(a.getLongitude()-b.getLongitude());double h=Math.sin(x/2)*Math.sin(x/2)+Math.cos(Math.toRadians(a.getLatitude()))*Math.cos(Math.toRadians(b.getLatitude()))*Math.sin(y/2)*Math.sin(y/2);if(6371*2*Math.asin(Math.sqrt(Math.min(1,h)))>5)throw error("5km 이내 이웃과 교환할 수 있어요.");}
 private void lockPosts(Post a,Post b){em.flush();if(a.getId()<b.getId()){em.refresh(a,LockModeType.PESSIMISTIC_WRITE);em.refresh(b,LockModeType.PESSIMISTIC_WRITE);}else{em.refresh(b,LockModeType.PESSIMISTIC_WRITE);em.refresh(a,LockModeType.PESSIMISTIC_WRITE);}}
 private View view(FridgeExchange e,Long viewer){boolean incoming=e.getWanted().getWriter().getId().equals(viewer);String state=e.getStatus();if("ACCEPTED".equals(state)&&e.getTrade().getStatus()==TradeRequestStatus.COMPLETED)state="COMPLETED";if("PENDING".equals(state)&&(!available(e.getOffered())||!available(e.getWanted())||blocked(e.getOffered().getWriter(),e.getWanted().getWriter())))state="EXPIRED";return new View(e.getId(),incoming,(incoming?e.getOffered():e.getWanted()).getWriter().getNickname(),e.getOffered().getIngredientName(),e.getOffered().getQuantity(),e.getWanted().getIngredientName(),e.getWanted().getQuantity(),state,e.getChatRoomId(),e.getCreatedAt(),e.getCancelRequestedBy()!=null,viewer.equals(e.getCancelRequestedBy()),e.getMeetingAt(),e.getMeetingPlace(),e.isMeetingConfirmed(),viewer.equals(e.getMeetingProposedBy()));}
 public List<View> mine(Long id){var all=new LinkedHashMap<Long,FridgeExchange>();exchanges.active(id).forEach(e->all.put(e.getId(),e));exchanges.mine(id,PageRequest.of(0,100)).forEach(e->all.putIfAbsent(e.getId(),e));return all.values().stream().map(e->view(e,id)).toList();}
 @Transactional public View propose(Long id,Long offeredId,Long wantedId){var offer=items.findByIdAndUserId(offeredId,id).orElseThrow(()->error("내 공개 재료를 선택해주세요."));var want=items.findById(wantedId).orElseThrow(()->error("상대 재료를 찾지 못했어요."));Post a=offer.getSharedPost(),b=want.getSharedPost();if(a==null||b==null)throw error("양쪽 재료를 먼저 공개해주세요.");participants(a.getWriter(),b.getWriter());lockPosts(a,b);if(!available(a)||!available(b))throw error("공개가 종료되거나 거래 중인 재료예요.");if(exchanges.duplicate(a.getId(),b.getId()))throw error("같은 재료의 교환 제안이 이미 있어요.");if(exchanges.active(id).stream().filter(e->"PENDING".equals(view(e,id).status())).count()>=20)throw error("대기 중인 제안을 먼저 정리해주세요.");var e=exchanges.save(new FridgeExchange(a,b));if(b.getWriter().isNotificationTradeRequest())notifications.createNotification(b.getWriter().getId(),"FRIDGE_EXCHANGE","냉장고 맞교환 제안",a.getWriter().getNickname()+"님이 "+a.getIngredientName()+" "+a.getQuantity()+"와 "+b.getIngredientName()+" "+b.getQuantity()+"의 교환을 제안했어요.","FRIDGE_EXCHANGE",e.getId());return view(e,id);}
 @Transactional public View act(Long id,Long exchangeId,String action){var e=exchanges.lockById(exchangeId).orElseThrow(()->error("제안을 찾지 못했어요."));boolean sender=e.getOffered().getWriter().getId().equals(id),receiver=e.getWanted().getWriter().getId().equals(id);if(!sender&&!receiver)throw new BusinessException(HttpStatus.FORBIDDEN,"교환 당사자만 확인할 수 있어요.");
  if(e.getTrade()!=null)em.refresh(e.getTrade(),LockModeType.PESSIMISTIC_WRITE);
  if("ACCEPTED".equals(e.getStatus())&&e.getTrade().getStatus()==TradeRequestStatus.ACCEPTED){
   User partner=sender?e.getWanted().getWriter():e.getOffered().getWriter();
   if("request-cancel".equals(action)){
    if(e.getCancelRequestedBy()!=null)throw error("이미 취소 요청이 있어요.");
    e.requestCancellation(id);notifyResult(e,partner,"맞교환 취소 요청","상대가 교환 취소를 요청했어요. 동의하면 양쪽 예약이 해제돼요.");return view(e,id);
   }
   if(Set.of("confirm-cancel","reject-cancel","withdraw-cancel").contains(action)){
    if(e.getCancelRequestedBy()==null)throw error("취소 요청이 없어요.");
    if("withdraw-cancel".equals(action)!=id.equals(e.getCancelRequestedBy()))throw error("상대의 취소 요청에만 답할 수 있어요.");
    if("confirm-cancel".equals(action)){e.getTrade().cancel();e.end("CANCELLED");}
    e.clearCancellation();notifyResult(e,partner,"맞교환 상태 변경","confirm-cancel".equals(action)?"교환이 취소됐어요. 재료 상태를 확인하고 다시 공개할 수 있어요.":"취소 요청이 종료됐어요. 교환은 계속 진행돼요.");return view(e,id);
   }
   if("confirm-meeting".equals(action)){
    if(e.getMeetingAt()==null||id.equals(e.getMeetingProposedBy())||e.getMeetingAt().isBefore(LocalDateTime.now(ZoneId.of("Asia/Seoul"))))throw error("상대가 제안한 앞으로의 약속만 확인할 수 있어요.");
    e.confirmMeeting();notifyResult(e,partner,"교환 약속 확정","상대가 만날 시간과 장소를 확인했어요.");return view(e,id);
   }
  }
  if("complete".equals(action)){if(!"ACCEPTED".equals(e.getStatus())||e.getCancelRequestedBy()!=null)throw error("취소 요청이 없는 진행 중 교환만 완료할 수 있어요.");if(e.getTrade().getStatus()!=TradeRequestStatus.COMPLETED)trades.complete(e.getTrade().getId(),id);return view(e,id);}
  if(!"PENDING".equals(e.getStatus()))throw error("이미 처리한 제안이에요.");
  if("cancel".equals(action)&&sender){e.end("CANCELLED");notifyResult(e,e.getWanted().getWriter(),"맞교환 제안 취소","상대가 맞교환 제안을 취소했어요.");return view(e,id);}if("reject".equals(action)&&receiver){e.end("REJECTED");notifyResult(e,e.getOffered().getWriter(),"맞교환 제안 거절","상대가 맞교환 제안을 거절했어요.");return view(e,id);}if(!"accept".equals(action)||!receiver)throw new BusinessException(HttpStatus.FORBIDDEN,"상대에게 받은 제안만 수락할 수 있어요.");
  Post a=e.getOffered(),b=e.getWanted();lockPosts(a,b);participants(a.getWriter(),b.getWriter());if(!available(a)||!available(b))throw error("재료의 공개나 거래 상태가 바뀌었어요. 다시 확인해주세요.");
  var trade=requests.save(TradeRequest.exchange(b,a.getWriter(),"맞교환: "+a.getIngredientName()+" ↔ "+b.getIngredientName()));trade.accept();a.close();b.close();
  for(Post p:List.of(a,b))requests.findAllByPostIdAndStatus(p.getId(),TradeRequestStatus.PENDING).forEach(r->r.reject());
  var room=chats.openRoomForTradeRequest(trade);e.accept(trade,room.getId());messages.save(ChatMessage.system(room,"맞교환이 수락됐어요. "+a.getWriter().getNickname()+": "+a.getIngredientName()+" "+a.getQuantity()+" ↔ "+b.getWriter().getNickname()+": "+b.getIngredientName()+" "+b.getQuantity()+". 상태와 만날 시간·장소를 확인해주세요."));
  for(User u:List.of(a.getWriter(),b.getWriter()))if(u.isNotificationTradeAccepted())notifications.createNotification(u.getId(),"FRIDGE_EXCHANGE","맞교환 수락","두 재료의 공개를 종료하고 채팅방을 열었어요.","CHAT_ROOM",room.getId());return view(e,id);
 }
 @Transactional public View meeting(Long id,Long exchangeId,LocalDateTime at,String place){
  var e=exchanges.lockById(exchangeId).orElseThrow(()->error("제안을 찾지 못했어요."));
  boolean sender=e.getOffered().getWriter().getId().equals(id),receiver=e.getWanted().getWriter().getId().equals(id);
  if(!sender&&!receiver)throw new BusinessException(HttpStatus.FORBIDDEN,"교환 당사자만 변경할 수 있어요.");
  if(e.getTrade()!=null)em.refresh(e.getTrade(),LockModeType.PESSIMISTIC_WRITE);
  if(!"ACCEPTED".equals(e.getStatus())||e.getTrade().getStatus()!=TradeRequestStatus.ACCEPTED||e.getCancelRequestedBy()!=null)throw error("진행 중인 교환에서 약속을 정해주세요.");
  var now=LocalDateTime.now(ZoneId.of("Asia/Seoul"));
  if(at==null||!at.isAfter(now)||at.isAfter(now.plusDays(30))||place==null||place.isBlank()||place.strip().length()>100)throw error("30일 이내의 시간과 100자 이내 장소를 입력해주세요.");
  e.proposeMeeting(id,at,place.strip());notifyResult(e,sender?e.getWanted().getWriter():e.getOffered().getWriter(),"교환 약속 제안","만날 시간과 장소가 제안됐어요. 확인해주세요.");return view(e,id);
 }
 private void notifyResult(FridgeExchange e,User user,String title,String message){if(user.isNotificationTradeAccepted())notifications.createNotification(user.getId(),"FRIDGE_EXCHANGE",title,message,"FRIDGE_EXCHANGE",e.getId());}

}
