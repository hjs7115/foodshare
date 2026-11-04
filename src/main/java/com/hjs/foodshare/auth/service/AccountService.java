package com.hjs.foodshare.auth.service;

import com.hjs.foodshare.auth.repository.RefreshTokenRepository;
import com.hjs.foodshare.chat.domain.ChatRoomMember;
import com.hjs.foodshare.fridge.exchange.FridgeExchange;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.trade.domain.TradeRequest;
import com.hjs.foodshare.trade.domain.TradeRequestStatus;
import com.hjs.foodshare.notification.service.NotificationService;
import com.hjs.foodshare.user.domain.User;
import jakarta.persistence.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
public class AccountService {
 @PersistenceContext private EntityManager em;
 private final PasswordEncoder passwords;
 private final NotificationService notifications;
 private final RefreshTokenRepository tokens;
 public AccountService(PasswordEncoder passwords,NotificationService notifications,RefreshTokenRepository tokens){this.passwords=passwords;this.notifications=notifications;this.tokens=tokens;}

 @Transactional
 public void withdraw(Long userId,String password){
  User user=em.find(User.class,userId);
  if(user==null||!user.isAvailable()||password==null||!passwords.matches(password,user.getPassword()))
   throw new BusinessException(HttpStatus.BAD_REQUEST,"현재 비밀번호를 확인해주세요.");
  var active=em.createQuery("select t from TradeRequest t where (t.post.writer.id=:id or t.requester.id=:id) and t.status in :states order by t.post.id,t.id",TradeRequest.class)
   .setParameter("id",userId).setParameter("states",java.util.List.of(TradeRequestStatus.PENDING,TradeRequestStatus.ACCEPTED)).getResultList();
  for(var trade:active){
   em.refresh(trade.getPost(),LockModeType.PESSIMISTIC_WRITE);em.refresh(trade,LockModeType.PESSIMISTIC_WRITE);
   if(trade.getStatus()!=TradeRequestStatus.PENDING&&trade.getStatus()!=TradeRequestStatus.ACCEPTED)continue;
   trade.cancel(userId,"상대방이 탈퇴했습니다.");
   Long other=trade.getRequester().getId().equals(userId)?trade.getPost().getWriter().getId():trade.getRequester().getId();
   notifications.createNotification(other,"TRADE_CANCELLED","거래 종료","상대방의 탈퇴로 거래가 종료되었습니다. 송금 금액은 자동 환불되지 않습니다.","TRADE_REQUEST",trade.getId());
   em.createQuery("select e from FridgeExchange e where e.trade.id=:id",FridgeExchange.class).setParameter("id",trade.getId()).getResultList().forEach(e->{e.end("CANCELLED");e.clearCancellation();});
  }
  active.stream().map(TradeRequest::getPost).filter(p->p.getPostType()==com.hjs.foodshare.post.domain.PostType.GROUP_BUY).distinct().forEach(p->{
   long count=em.createQuery("select count(t) from TradeRequest t where t.post.id=:post and t.status in :states",Long.class).setParameter("post",p.getId()).setParameter("states",java.util.List.of(TradeRequestStatus.ACCEPTED,TradeRequestStatus.COMPLETED)).getSingleResult();
   p.updateParticipantCount((int)count+1);
  });
  em.createQuery("select p from Post p where p.writer.id=:id",Post.class).setParameter("id",userId).getResultList().forEach(Post::delete);
  em.createQuery("select e from FridgeExchange e where e.status='PENDING' and (e.offered.writer.id=:id or e.wanted.writer.id=:id)",FridgeExchange.class).setParameter("id",userId).getResultList().forEach(e->e.end("CANCELLED"));
  em.createQuery("select m from ChatRoomMember m where m.user.id=:id",ChatRoomMember.class).setParameter("id",userId).getResultList().forEach(ChatRoomMember::leave);
  em.createQuery("delete from UserFcmToken t where t.user.id=:id").setParameter("id",userId).executeUpdate();
  em.createQuery("delete from FridgeItem f where f.user.id=:id").setParameter("id",userId).executeUpdate();
  em.createQuery("delete from ShoppingItem i where i.userId=:id").setParameter("id",userId).executeUpdate();
  em.createQuery("delete from ShoppingPreference p where p.userId=:id").setParameter("id",userId).executeUpdate();
  em.createQuery("delete from SavedMeal m where m.userId=:id").setParameter("id",userId).executeUpdate();
  tokens.deleteAllByUserId(userId);
  user.withdraw();
 }
}
