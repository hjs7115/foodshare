package com.hjs.foodshare.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "phone_verifications")
public class PhoneVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String phoneNumber;

    @Column(nullable = false, length = 120, unique = true)
    private String code;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private boolean verified;

    @Column(nullable = false)
    private boolean used;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected PhoneVerification() {
    }

    private PhoneVerification(String phoneNumber, String code, LocalDateTime expiresAt) {
        this.phoneNumber = phoneNumber;
        this.code = code;
        this.expiresAt = expiresAt;
        this.verified = false;
        this.used = false;
        this.createdAt = LocalDateTime.now();
    }

    public static PhoneVerification create(String phoneNumber, String code, LocalDateTime expiresAt) {
        return new PhoneVerification(phoneNumber, code, expiresAt);
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public String getCode() {
        return code;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public boolean isVerified() {
        return verified;
    }

    public boolean isUsed() {
        return used;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void verify() {
        this.verified = true;
    }

    public void use() {
        this.used = true;
    }
}
