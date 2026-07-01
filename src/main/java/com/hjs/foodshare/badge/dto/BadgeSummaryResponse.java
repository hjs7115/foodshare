package com.hjs.foodshare.badge.dto;

import java.util.List;

public record BadgeSummaryResponse(
        int totalCount,
        int achievedCount,
        List<BadgeResponse> badges
) {

    public static BadgeSummaryResponse from(List<BadgeResponse> badges) {
        int achievedCount = (int) badges.stream()
                .filter(BadgeResponse::achieved)
                .count();
        return new BadgeSummaryResponse(badges.size(), achievedCount, badges);
    }
}
