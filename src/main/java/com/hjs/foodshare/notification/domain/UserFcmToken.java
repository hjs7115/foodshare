package com.hjs.foodshare.notification.domain;

import com.hjs.foodshare.user.domain.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "user_fcm_tokens",
        uniqueConstraints = @UniqueConstraint(name = "uk_user_fcm_tokens_token", columnNames = "token"),
        indexes = @Index(name = "idx_user_fcm_tokens_user_id", columnList = "user_id"))
public class UserFcmToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 500)
    private String token;

    protected UserFcmToken() {
    }

    private UserFcmToken(User user, String token) {
        this.user = user;
        this.token = token;
    }

    public static UserFcmToken create(User user, String token) {
        return new UserFcmToken(user, token);
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getToken() { return token; }

    public void moveTo(User user) {
        this.user = user;
    }
}
