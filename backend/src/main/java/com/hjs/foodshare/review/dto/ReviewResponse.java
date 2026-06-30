package com.hjs.foodshare.review.dto;

import com.hjs.foodshare.review.domain.Review;
import java.time.LocalDateTime;

public record ReviewResponse(
        Long reviewId,
        Long tradeRequestId,
        Long reviewerId,
        String reviewerNickname,
        Long targetUserId,
        String targetUserNickname,
        Integer rating,
        String content,
        LocalDateTime createdAt
) {

    public static ReviewResponse from(Review review) {
        return new ReviewResponse(
                review.getId(),
                review.getTradeRequest().getId(),
                review.getReviewer().getId(),
                review.getReviewer().getNickname(),
                review.getTargetUser().getId(),
                review.getTargetUser().getNickname(),
                review.getRating(),
                review.getContent(),
                review.getCreatedAt()
        );
    }
}
