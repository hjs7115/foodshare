package com.hjs.foodshare.fridge.exchange;
import jakarta.persistence.*;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.trade.domain.TradeRequest;
import java.time.LocalDateTime;
@Entity @Table(name="fridge_exchanges",indexes={@Index(name="idx_exchange_created",columnList="created_at")})
public class FridgeExchange {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="offered_post_id",nullable=false) private Post offered;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="wanted_post_id",nullable=false) private Post wanted;
 @Column(nullable=false,length=20) private String status="PENDING";
 @Column(nullable=false) private LocalDateTime createdAt=LocalDateTime.now(java.time.ZoneId.of("Asia/Seoul"));
 @OneToOne(fetch=FetchType.LAZY) private TradeRequest trade;
 private Long chatRoomId;
 private Long cancelRequestedBy;
 private LocalDateTime meetingAt;
 @Column(length=100) private String meetingPlace;
 private Long meetingProposedBy;
 private Boolean meetingConfirmed;
 public Long getCancelRequestedBy(){return cancelRequestedBy;}
 public void requestCancellation(Long id){cancelRequestedBy=id;}
 public void clearCancellation(){cancelRequestedBy=null;}
 public LocalDateTime getMeetingAt(){return meetingAt;}
 public String getMeetingPlace(){return meetingPlace;}
 public Long getMeetingProposedBy(){return meetingProposedBy;}
 public boolean isMeetingConfirmed(){return Boolean.TRUE.equals(meetingConfirmed);}
 public void proposeMeeting(Long user,LocalDateTime at,String place){meetingProposedBy=user;meetingAt=at;meetingPlace=place;meetingConfirmed=false;}
 public void confirmMeeting(){meetingConfirmed=true;}

 protected FridgeExchange(){}
 public FridgeExchange(Post offered,Post wanted){this.offered=offered;this.wanted=wanted;}
 public Long getId(){return id;} public Post getOffered(){return offered;} public Post getWanted(){return wanted;}
 public String getStatus(){return status;} public LocalDateTime getCreatedAt(){return createdAt;}
 public TradeRequest getTrade(){return trade;} public Long getChatRoomId(){return chatRoomId;}
 public void end(String status){this.status=status;}
 public void accept(TradeRequest trade,Long room){this.trade=trade;chatRoomId=room;status="ACCEPTED";}
}
