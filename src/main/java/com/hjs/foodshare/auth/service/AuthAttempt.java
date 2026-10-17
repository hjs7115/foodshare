package com.hjs.foodshare.auth.service;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="auth_attempts",indexes=@Index(name="idx_auth_attempt_expiry",columnList="expires_at"))
public class AuthAttempt {
 @Id @Column(length=64) String id;
 int attempts;
 Instant expiresAt;
 protected AuthAttempt(){}
 AuthAttempt(String id,Instant expiry){this.id=id;expiresAt=expiry;}
}
