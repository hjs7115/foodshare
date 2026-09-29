package com.hjs.foodshare.ai.dto;

import com.hjs.foodshare.ai.domain.ConfidenceLevel;
import com.hjs.foodshare.ai.domain.QualityGrade;

public record IngredientVisionResult(
        String ingredientName,
        QualityGrade qualityGrade,
        String qualityReason,
        int estimatedConsumptionDaysMin,
        int estimatedConsumptionDaysMax,
        ConfidenceLevel confidenceLevel
) {
}
