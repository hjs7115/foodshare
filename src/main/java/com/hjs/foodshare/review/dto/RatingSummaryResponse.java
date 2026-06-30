package com.hjs.foodshare.review.dto;

public record RatingSummaryResponse(
        Long userId,
        double averageRating,
        long reviewCount
) {
}
