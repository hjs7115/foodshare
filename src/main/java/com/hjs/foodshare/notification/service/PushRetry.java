package com.hjs.foodshare.notification.service;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="push_retries",indexes=@Index(name="idx_push_retry_due",columnList="due_at"))
public class PushRetry {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
 Long userId; Long tokenId;
 @Column(length=80) String type;
 @Column(length=200) String title;
 @Column(length=2000) String body;
 String targetType; Long targetId;
 int attempts;
 Instant dueAt;
 Instant expiresAt;
 protected PushRetry(){}
 PushRetry(Long userId,Long tokenId,String type,String title,String body,String targetType,Long targetId){this.userId=userId;this.tokenId=tokenId;this.type=type;this.title=title;this.body=body;this.targetType=targetType;this.targetId=targetId;dueAt=Instant.now().plusSeconds(60);expiresAt=Instant.now().plusSeconds(3600);}
}
