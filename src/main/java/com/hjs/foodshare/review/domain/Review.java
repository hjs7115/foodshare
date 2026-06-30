package com.hjs.foodshare.review.domain;

import com.hjs.foodshare.trade.domain.TradeRequest;
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
import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trade_request_id", nullable = false)
    private TradeRequest tradeRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id", nullable = false)
    private User targetUser;

    @Column(nullable = false)
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected Review() {
    }

    private Review(TradeRequest tradeRequest, User reviewer, User targetUser, Integer rating, String content) {
        this.tradeRequest = tradeRequest;
        this.reviewer = reviewer;
        this.targetUser = targetUser;
        this.rating = rating;
        this.content = content;
        this.createdAt = LocalDateTime.now();
    }

    public static Review create(TradeRequest tradeRequest, User reviewer, User targetUser, Integer rating, String content) {
        return new Review(tradeRequest, reviewer, targetUser, rating, content);
    }

    public Long getId() { return id; }

    public TradeRequest getTradeRequest() { return tradeRequest; }

    public User getReviewer() { return reviewer; }

    public User getTargetUser() { return targetUser; }

    public Integer getRating() { return rating; }

    public String getContent() { return content; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
