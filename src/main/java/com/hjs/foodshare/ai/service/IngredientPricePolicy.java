package com.hjs.foodshare.ai.service;

import com.hjs.foodshare.ai.domain.QualityGrade;
import org.springframework.stereotype.Component;

@Component
public class IngredientPricePolicy {

    public static final String VERSION = "v1";

    public PriceSuggestion calculate(Integer originalPrice, QualityGrade qualityGrade, int remainingDaysMax) {
        if (originalPrice == null || originalPrice <= 0) {
            return new PriceSuggestion(null, null);
        }

        double qualityFactor = switch (qualityGrade) {
            case EXCELLENT -> 0.80;
            case GOOD -> 0.68;
            case FAIR -> 0.45;
            case POOR -> 0.20;
        };
        double periodFactor = remainingDaysMax >= 7 ? 1.00
                : remainingDaysMax >= 4 ? 0.85
                : remainingDaysMax >= 2 ? 0.65
                : 0.40;

        int minimum = roundToHundred(originalPrice * 0.10);
        int maximum = roundToHundred(originalPrice * 0.80);
        int recommended = clamp(roundToHundred(originalPrice * qualityFactor * periodFactor), minimum, maximum);
        int quickSale = clamp(roundToHundred(recommended * 0.80), minimum, recommended);
        return new PriceSuggestion(recommended, quickSale);
    }

    private int roundToHundred(double value) {
        return Math.max(0, (int) (Math.round(value / 100.0) * 100));
    }

    private int clamp(int value, int minimum, int maximum) {
        return Math.max(minimum, Math.min(value, maximum));
    }

    public record PriceSuggestion(Integer recommendedPrice, Integer quickSalePrice) {
    }
}
