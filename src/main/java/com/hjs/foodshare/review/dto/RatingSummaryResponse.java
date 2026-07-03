package com.hjs.foodshare.review.dto;

public record RatingSummaryResponse(
        Long userId,
        double averageRating,
        double freshness,
        String freshnessLevel,
        String freshnessIcon,
        String freshnessLabel,
        long reviewCount
) {
}
