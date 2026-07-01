package com.hjs.foodshare.moderation.domain;

import com.hjs.foodshare.user.domain.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "user_blocks",
        uniqueConstraints = @UniqueConstraint(name = "uk_user_blocks_pair", columnNames = {"blocker_id", "blocked_user_id"})
)
public class UserBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blocker_id", nullable = false)
    private User blocker;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blocked_user_id", nullable = false)
    private User blockedUser;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected UserBlock() {
    }

    private UserBlock(User blocker, User blockedUser) {
        this.blocker = blocker;
        this.blockedUser = blockedUser;
        this.createdAt = LocalDateTime.now();
    }

    public static UserBlock create(User blocker, User blockedUser) {
        return new UserBlock(blocker, blockedUser);
    }

    public Long getId() {
        return id;
    }

    public User getBlocker() {
        return blocker;
    }

    public User getBlockedUser() {
        return blockedUser;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
