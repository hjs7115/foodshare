package com.hjs.foodshare.review.service;

public final class FreshnessCalculator {

    private static final double BASE_FRESHNESS = 50.0;

    private FreshnessCalculator() {
    }

    public static double baseScore() {
        return BASE_FRESHNESS;
    }

    public static double update(double currentFreshness, int rating) {
        double targetScore = toTargetScore(rating);
        double alpha = toAlpha(rating);
        if (alpha == 0.0) {
            return round(bound(currentFreshness));
        }

        double freshness = (currentFreshness * (1 - alpha)) + (targetScore * alpha);
        return round(bound(freshness));
    }

    private static double toTargetScore(int rating) {
        return switch (rating) {
            case 5 -> 100.0;
            case 4 -> 80.0;
            case 2 -> 30.0;
            case 1 -> 0.0;
            default -> BASE_FRESHNESS;
        };
    }

    private static double toAlpha(int rating) {
        return switch (rating) {
            case 5 -> 0.04;
            case 4 -> 0.03;
            case 2 -> 0.10;
            case 1 -> 0.14;
            default -> 0.0;
        };
    }

    private static double bound(double freshness) {
        return Math.max(0.0, Math.min(freshness, 100.0));
    }

    private static double round(double freshness) {
        return Math.round(freshness * 10.0) / 10.0;
    }
}
