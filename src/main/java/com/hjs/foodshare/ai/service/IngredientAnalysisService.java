package com.hjs.foodshare.ai.service;

import com.hjs.foodshare.ai.domain.IngredientAnalysis;
import com.hjs.foodshare.ai.domain.OpenStatus;
import com.hjs.foodshare.ai.domain.StorageMethod;
import com.hjs.foodshare.ai.dto.IngredientAnalysisResponse;
import com.hjs.foodshare.ai.dto.IngredientVisionResult;
import com.hjs.foodshare.ai.repository.IngredientAnalysisRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional(readOnly = true)
public class IngredientAnalysisService {

    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;

    private final IngredientAnalysisRepository ingredientAnalysisRepository;
    private final UserRepository userRepository;
    private final OpenAiIngredientVisionClient visionClient;
    private final IngredientPricePolicy pricePolicy;

    public IngredientAnalysisService(
            IngredientAnalysisRepository ingredientAnalysisRepository,
            UserRepository userRepository,
            OpenAiIngredientVisionClient visionClient,
            IngredientPricePolicy pricePolicy
    ) {
        this.ingredientAnalysisRepository = ingredientAnalysisRepository;
        this.userRepository = userRepository;
        this.visionClient = visionClient;
        this.pricePolicy = pricePolicy;
    }

    @Transactional
    public IngredientAnalysisResponse analyze(
            Long userId,
            MultipartFile image,
            StorageMethod storageMethod,
            OpenStatus openStatus,
            LocalDate purchaseDate,
            String quantity,
            Integer originalPrice
    ) {
        validateImage(image);
        if (quantity == null || quantity.isBlank()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "수량을 입력해주세요.");
        }

        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));
        IngredientVisionResult vision = visionClient.analyze(image, storageMethod, openStatus, purchaseDate);
        IngredientPricePolicy.PriceSuggestion prices = pricePolicy.calculate(
                originalPrice,
                vision.qualityGrade(),
                vision.estimatedConsumptionDaysMax()
        );

        IngredientAnalysis analysis = IngredientAnalysis.create(
                owner,
                vision.ingredientName(),
                vision.qualityGrade(),
                vision.qualityReason(),
                vision.estimatedConsumptionDaysMin(),
                vision.estimatedConsumptionDaysMax(),
                vision.confidenceLevel(),
                storageMethod,
                openStatus,
                purchaseDate,
                quantity.trim(),
                originalPrice,
                prices.recommendedPrice(),
                prices.quickSalePrice(),
                "AI",
                visionClient.modelVersion(),
                IngredientPricePolicy.VERSION
        );

        return IngredientAnalysisResponse.from(ingredientAnalysisRepository.save(analysis));
    }

    @Transactional
    public IngredientAnalysis claimForPost(Long analysisId, Long userId) {
        if (analysisId == null) {
            return null;
        }

        IngredientAnalysis analysis = ingredientAnalysisRepository.findById(analysisId)
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST, "AI 분석 결과를 찾을 수 없습니다."));
        if (!analysis.getOwner().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "본인의 AI 분석 결과만 사용할 수 있습니다.");
        }
        if (analysis.isConsumed()) {
            throw new BusinessException(HttpStatus.CONFLICT, "이미 게시글에 사용된 AI 분석 결과입니다.");
        }
        if (analysis.getAnalyzedAt().isBefore(LocalDateTime.now().minusHours(24))) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "AI 분석 결과가 만료되었습니다. 다시 분석해주세요.");
        }

        analysis.markConsumed();
        return analysis;
    }

    private void validateImage(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "분석할 사진을 첨부해주세요.");
        }
        if (image.getSize() > MAX_IMAGE_SIZE) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "사진은 5MB 이하만 분석할 수 있습니다.");
        }
        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "이미지 파일만 분석할 수 있습니다.");
        }
    }
}
