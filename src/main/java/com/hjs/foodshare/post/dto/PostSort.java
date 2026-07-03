package com.hjs.foodshare.post.dto;

import java.util.Locale;

public enum PostSort {
    LATEST,
    EXPIRING_SOON,
    FRESHNESS,
    DISTANCE,
    PRICE_LOW;

    public static PostSort from(String value) {
        if (value == null || value.isBlank()) {
            return LATEST;
        }

        String normalized = value.trim()
                .replace("-", "_")
                .toUpperCase(Locale.ROOT);

        return switch (normalized) {
            case "LATEST", "LATEST_FIRST", "RECENT", "NEWEST" -> LATEST;
            case "EXPIRING_SOON", "EXPIRY", "DEADLINE", "EXPIRATION" -> EXPIRING_SOON;
            case "FRESHNESS", "FRESHNESS_HIGH", "RATING", "RATING_HIGH" -> FRESHNESS;
            case "DISTANCE", "NEAREST", "NEAR" -> DISTANCE;
            case "PRICE_LOW", "PRICE", "LOW_PRICE", "PRICE_ASC" -> PRICE_LOW;
            default -> LATEST;
        };
    }
}
