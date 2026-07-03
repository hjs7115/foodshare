package com.hjs.foodshare.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, unique = true, length = 50)
    private String nickname;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, unique = true, length = 20)
    private String phoneNumber;

    @Column(length = 100)
    private String location;

    private Double latitude;

    private Double longitude;

    @Column(columnDefinition = "TEXT")
    private String profileImage;

    @Column(nullable = false, columnDefinition = "double default 50.0")
    private Double freshnessScore;

    private Boolean notificationNewPost;

    private Boolean notificationComment;

    private Boolean notificationTradeRequest;

    private Boolean notificationTradeAccepted;

    private Boolean notificationMarketing;

    @Column(columnDefinition = "TEXT")
    private String fcmToken;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected User() {
    }

    private User(String name, String nickname, String email, String password,
                 String phoneNumber, String location) {
        this.name = name;
        this.nickname = nickname;
        this.email = email;
        this.password = password;
        this.phoneNumber = phoneNumber;
        this.location = location;
        this.freshnessScore = 50.0;
        this.notificationNewPost = true;
        this.notificationComment = true;
        this.notificationTradeRequest = true;
        this.notificationTradeAccepted = true;
        this.notificationMarketing = false;
        this.createdAt = LocalDateTime.now();
    }

    public static User create(String name, String nickname, String email, String password,
                              String phoneNumber, String location) {
        return new User(name, nickname, email, password, phoneNumber, location);
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getNickname() {
        return nickname;
    }

    public String getEmail() {
        return email;
    }

    public String getPassword() {
        return password;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public String getLocation() {
        return location;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public String getProfileImage() {
        return profileImage;
    }

    public double getFreshnessScore() {
        return freshnessScore == null ? 50.0 : freshnessScore;
    }

    public boolean isNotificationNewPost() {
        return notificationNewPost == null || notificationNewPost;
    }

    public boolean isNotificationComment() {
        return notificationComment == null || notificationComment;
    }

    public boolean isNotificationTradeRequest() {
        return notificationTradeRequest == null || notificationTradeRequest;
    }

    public boolean isNotificationTradeAccepted() {
        return notificationTradeAccepted == null || notificationTradeAccepted;
    }

    public boolean isNotificationMarketing() {
        return Boolean.TRUE.equals(notificationMarketing);
    }

    public String getFcmToken() {
        return fcmToken;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void changePassword(String password) {
        this.password = password;
    }

    public void updateProfile(String nickname, String location, String profileImage) {
        if (nickname != null && !nickname.isBlank()) {
            this.nickname = nickname;
        }
        if (location != null && !location.isBlank()) {
            this.location = location;
        }
        if (profileImage != null) {
            this.profileImage = profileImage;
        }
    }

    public void updateLocation(String location, Double latitude, Double longitude) {
        if (location != null && !location.isBlank()) {
            this.location = location;
        }
        if (latitude != null) {
            this.latitude = latitude;
        }
        if (longitude != null) {
            this.longitude = longitude;
        }
    }

    public void updateNotificationSettings(boolean newPost, boolean comment, boolean tradeRequest,
                                           boolean tradeAccepted, boolean marketing) {
        this.notificationNewPost = newPost;
        this.notificationComment = comment;
        this.notificationTradeRequest = tradeRequest;
        this.notificationTradeAccepted = tradeAccepted;
        this.notificationMarketing = marketing;
    }

    public void updateFcmToken(String fcmToken) {
        this.fcmToken = fcmToken;
    }

    public void clearFcmToken() {
        this.fcmToken = null;
    }

    public void updateFreshnessScore(double freshnessScore) {
        this.freshnessScore = Math.max(0.0, Math.min(freshnessScore, 100.0));
    }
}
