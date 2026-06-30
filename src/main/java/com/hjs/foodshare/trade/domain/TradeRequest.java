package com.hjs.foodshare.trade.domain;

import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.user.domain.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "trade_requests")
public class TradeRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TradeRequestStatus status;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime respondedAt;

    private LocalDateTime completedAt;

    protected TradeRequest() {
    }

    private TradeRequest(Post post, User requester) {
        this.post = post;
        this.requester = requester;
        this.status = TradeRequestStatus.PENDING;
        this.createdAt = LocalDateTime.now();
    }

    public static TradeRequest create(Post post, User requester) {
        return new TradeRequest(post, requester);
    }

    public void accept() {
        this.status = TradeRequestStatus.ACCEPTED;
        this.respondedAt = LocalDateTime.now();
    }

    public void reject() {
        this.status = TradeRequestStatus.REJECTED;
        this.respondedAt = LocalDateTime.now();
    }

    public void complete() {
        this.status = TradeRequestStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }

    public Post getPost() { return post; }

    public User getRequester() { return requester; }

    public TradeRequestStatus getStatus() { return status; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public LocalDateTime getRespondedAt() { return respondedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
}
