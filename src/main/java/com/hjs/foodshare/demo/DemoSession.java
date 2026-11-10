package com.hjs.foodshare.demo;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity @Table(name="demo_sessions",indexes=@Index(name="idx_demo_owner",columnList="userId,reset"))
public class DemoSession {
 @Id public Long requestId;
 @Column(nullable=false) public Long userId;
 @Column(nullable=false) public Long sourcePostId;
 @Column(nullable=false) public Long privatePostId;
 @Column(nullable=false) public LocalDateTime dueAt;
 public Long roomId;
 public long repliedThrough;
 public int replyCount;
 public boolean reset;
 public boolean finished;
 protected DemoSession() {}
 public DemoSession(Long request,Long user,Long source,Long post) {
  requestId=request;userId=user;sourcePostId=source;privatePostId=post;dueAt=LocalDateTime.now().plusSeconds(10);
 }
}
