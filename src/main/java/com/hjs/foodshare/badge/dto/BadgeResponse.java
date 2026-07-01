package com.hjs.foodshare.badge.dto;

public record BadgeResponse(
        String badgeId,
        String name,
        String description,
        int currentValue,
        int targetValue,
        boolean achieved,
        double progress
) {

    public static BadgeResponse of(String badgeId, String name, String description,
                                   int currentValue, int targetValue) {
        int safeTarget = Math.max(targetValue, 1);
        double progress = Math.min(1.0, currentValue / (double) safeTarget);
        return new BadgeResponse(
                badgeId,
                name,
                description,
                currentValue,
                safeTarget,
                currentValue >= safeTarget,
                Math.round(progress * 100.0) / 100.0
        );
    }
}
