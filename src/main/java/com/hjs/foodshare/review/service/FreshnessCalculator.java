package com.hjs.foodshare.review.service;

public final class FreshnessCalculator {

    private static final double BASE_FRESHNESS = 50.0;
    private static final double POSITIVE_ALPHA = 0.04;
    private static final double NEGATIVE_ALPHA = 0.12;

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
            case 4 -> 70.0;
            case 2 -> 20.0;
            case 1 -> 0.0;
            default -> BASE_FRESHNESS;
        };
    }

    private static double toAlpha(int rating) {
        if (rating >= 4) {
            return POSITIVE_ALPHA;
        }
        if (rating <= 2) {
            return NEGATIVE_ALPHA;
        }
        return 0.0;
    }

    private static double bound(double freshness) {
        return Math.max(0.0, Math.min(freshness, 100.0));
    }

    private static double round(double freshness) {
        return Math.round(freshness * 10.0) / 10.0;
    }
}
