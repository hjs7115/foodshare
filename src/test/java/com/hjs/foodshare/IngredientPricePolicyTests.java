package com.hjs.foodshare;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.hjs.foodshare.ai.domain.QualityGrade;
import com.hjs.foodshare.ai.service.IngredientPricePolicy;
import org.junit.jupiter.api.Test;

class IngredientPricePolicyTests {

    private final IngredientPricePolicy policy = new IngredientPricePolicy();

    @Test
    void recommendationStaysInsideConfiguredOriginalPriceRange() {
        var excellent = policy.calculate(10_000, QualityGrade.EXCELLENT, 10);
        var poor = policy.calculate(10_000, QualityGrade.POOR, 0);

        assertEquals(8_000, excellent.recommendedPrice());
        assertEquals(1_000, poor.recommendedPrice());
        assertTrue(excellent.quickSalePrice() <= excellent.recommendedPrice());
        assertTrue(poor.quickSalePrice() >= 1_000);
    }

    @Test
    void missingOriginalPriceSkipsPriceRecommendation() {
        var suggestion = policy.calculate(null, QualityGrade.GOOD, 4);

        assertNull(suggestion.recommendedPrice());
        assertNull(suggestion.quickSalePrice());
    }
}
