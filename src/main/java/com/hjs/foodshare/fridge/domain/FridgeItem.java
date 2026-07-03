package com.hjs.foodshare.fridge.domain;

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
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "fridge_items",
        indexes = {
                @Index(name = "idx_fridge_items_user_expiry", columnList = "user_id,expiry_date")
        }
)
public class FridgeItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 50)
    private String amount;

    @Column(nullable = false)
    private LocalDate expiryDate;

    @Column(nullable = false, length = 30)
    private String storagePlace;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    protected FridgeItem() {
    }

    private FridgeItem(User user, String name, String amount, LocalDate expiryDate, String storagePlace, String memo) {
        this.user = user;
        this.name = name;
        this.amount = amount;
        this.expiryDate = expiryDate;
        this.storagePlace = storagePlace;
        this.memo = memo;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    public static FridgeItem create(User user, String name, String amount, LocalDate expiryDate,
                                    String storagePlace, String memo) {
        return new FridgeItem(user, name, amount, expiryDate, storagePlace, memo);
    }

    public void update(String name, String amount, LocalDate expiryDate, String storagePlace, String memo) {
        this.name = name;
        this.amount = amount;
        this.expiryDate = expiryDate;
        this.storagePlace = storagePlace;
        this.memo = memo;
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getName() {
        return name;
    }

    public String getAmount() {
        return amount;
    }

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public String getStoragePlace() {
        return storagePlace;
    }

    public String getMemo() {
        return memo;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
