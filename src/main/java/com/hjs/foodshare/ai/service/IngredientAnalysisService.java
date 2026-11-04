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

    @org.springframework.beans.factory.annotation.Autowired private com.hjs.foodshare.auth.service.AuthThrottle throttle;
    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;

    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager em;
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
        throttle.check("ingredient-ai-hour",userId.toString(),10,3600);
        throttle.check("ingredient-ai-day",userId.toString(),30,86400);
        if (quantity == null || quantity.isBlank() || quantity.strip().length()>50 || (originalPrice!=null && (originalPrice<0 || originalPrice>1_000_000_000)) || (purchaseDate!=null && purchaseDate.isAfter(LocalDate.now(java.time.ZoneId.of("Asia/Seoul"))))) {
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

        analysis.setImageFingerprint(com.hjs.foodshare.upload.service.ImageFingerprint.of(image));
        return IngredientAnalysisResponse.from(ingredientAnalysisRepository.save(analysis));
    }

    @Transactional
    public IngredientAnalysis claimForPost(Long analysisId, Long userId) { return claimForPost(analysisId,userId,null); }

    @Transactional
    public IngredientAnalysis claimForPost(Long analysisId,Long userId,String imageUrl) {
        if (analysisId == null) {
            return null;
        }

        IngredientAnalysis analysis = ingredientAnalysisRepository.findById(analysisId)
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST, "AI 분석 결과를 찾을 수 없습니다."));
        if (!analysis.getOwner().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "본인의 AI 분석 결과만 사용할 수 있습니다.");
        }
        em.refresh(analysis,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        var uploaded=imageUrl!=null&&imageUrl.startsWith("/uploads/")?em.find(com.hjs.foodshare.upload.service.UploadedImage.class,imageUrl.substring(9)):null;
        if(uploaded==null || analysis.getImageFingerprint()==null || !analysis.getImageFingerprint().equals(uploaded.getFingerprint()))
            throw new BusinessException(HttpStatus.BAD_REQUEST,"분석한 사진과 게시할 사진이 다릅니다. 현재 사진으로 다시 분석해주세요.");
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
        try(var input=new javax.imageio.stream.MemoryCacheImageInputStream(image.getInputStream())){
            var readers=javax.imageio.ImageIO.getImageReaders(input);if(!readers.hasNext())throw new BusinessException(HttpStatus.BAD_REQUEST,"읽을 수 없는 사진입니다.");
            var reader=readers.next();try{reader.setInput(input);long pixels=(long)reader.getWidth(0)*reader.getHeight(0);if(pixels<1||pixels>40_000_000)throw new BusinessException(HttpStatus.BAD_REQUEST,"사진 크기를 확인해주세요.");}finally{reader.dispose();}
        }catch(java.io.IOException e){throw new BusinessException(HttpStatus.BAD_REQUEST,"사진을 읽을 수 없습니다.");}
        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "이미지 파일만 분석할 수 있습니다.");
        }
    }
}
