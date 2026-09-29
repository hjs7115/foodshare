package com.hjs.foodshare.ai.dto;

import com.hjs.foodshare.ai.domain.ConfidenceLevel;
import com.hjs.foodshare.ai.domain.IngredientAnalysis;
import com.hjs.foodshare.ai.domain.QualityGrade;
import java.time.LocalDateTime;

public record IngredientAnalysisResponse(
        Long analysisId,
        LocalDateTime analyzedAt,
        String analysisMode,
        IngredientResult ingredient,
        ConsumptionEstimate consumptionEstimate,
        ConfidenceLevel confidenceLevel,
        PricingResult pricing
) {
    public record IngredientResult(
            String name,
            QualityGrade qualityGrade,
            String qualityReason
    ) {
    }

    public record ConsumptionEstimate(
            int daysMin,
            int daysMax
    ) {
    }

    public record PricingResult(
            Integer recommendedPrice,
            Integer quickSalePrice,
            String policyVersion
    ) {
    }

    public static IngredientAnalysisResponse from(IngredientAnalysis analysis) {
        if (analysis == null) {
            return null;
        }
        return new IngredientAnalysisResponse(
                analysis.getId(),
                analysis.getAnalyzedAt(),
                analysis.getAnalysisMode(),
                new IngredientResult(
                        analysis.getIngredientName(),
                        analysis.getQualityGrade(),
                        analysis.getQualityReason()
                ),
                new ConsumptionEstimate(
                        analysis.getEstimatedConsumptionDaysMin(),
                        analysis.getEstimatedConsumptionDaysMax()
                ),
                analysis.getConfidenceLevel(),
                new PricingResult(
                        analysis.getRecommendedPrice(),
                        analysis.getQuickSalePrice(),
                        analysis.getPricePolicyVersion()
                )
        );
    }
}
