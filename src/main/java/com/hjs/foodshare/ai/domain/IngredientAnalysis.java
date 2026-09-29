package com.hjs.foodshare.ai.domain;

import com.hjs.foodshare.user.domain.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "ingredient_analyses",
        indexes = {
                @Index(name = "idx_ingredient_analysis_user_created", columnList = "user_id,analyzed_at")
        }
)
public class IngredientAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 100)
    private String ingredientName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QualityGrade qualityGrade;

    @Column(nullable = false, length = 500)
    private String qualityReason;

    @Column(nullable = false)
    private Integer estimatedConsumptionDaysMin;

    @Column(nullable = false)
    private Integer estimatedConsumptionDaysMax;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ConfidenceLevel confidenceLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StorageMethod storageMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OpenStatus openStatus;

    private LocalDate purchaseDate;

    @Column(nullable = false, length = 50)
    private String quantity;

    private Integer originalPrice;

    private Integer recommendedPrice;

    private Integer quickSalePrice;

    @Column(nullable = false, length = 20)
    private String analysisMode;

    @Column(nullable = false, length = 50)
    private String modelVersion;

    @Column(nullable = false, length = 20)
    private String pricePolicyVersion;

    @Column(nullable = false)
    private LocalDateTime analyzedAt;

    @Column(nullable = false)
    private boolean consumed;

    protected IngredientAnalysis() {
    }

    private IngredientAnalysis(User owner, String ingredientName, QualityGrade qualityGrade,
                               String qualityReason, int daysMin, int daysMax,
                               ConfidenceLevel confidenceLevel, StorageMethod storageMethod,
                               OpenStatus openStatus, LocalDate purchaseDate, String quantity,
                               Integer originalPrice, Integer recommendedPrice, Integer quickSalePrice,
                               String analysisMode, String modelVersion, String pricePolicyVersion) {
        this.owner = owner;
        this.ingredientName = ingredientName;
        this.qualityGrade = qualityGrade;
        this.qualityReason = qualityReason;
        this.estimatedConsumptionDaysMin = daysMin;
        this.estimatedConsumptionDaysMax = daysMax;
        this.confidenceLevel = confidenceLevel;
        this.storageMethod = storageMethod;
        this.openStatus = openStatus;
        this.purchaseDate = purchaseDate;
        this.quantity = quantity;
        this.originalPrice = originalPrice;
        this.recommendedPrice = recommendedPrice;
        this.quickSalePrice = quickSalePrice;
        this.analysisMode = analysisMode;
        this.modelVersion = modelVersion;
        this.pricePolicyVersion = pricePolicyVersion;
        this.analyzedAt = LocalDateTime.now();
        this.consumed = false;
    }

    public static IngredientAnalysis create(
            User owner,
            String ingredientName,
            QualityGrade qualityGrade,
            String qualityReason,
            int daysMin,
            int daysMax,
            ConfidenceLevel confidenceLevel,
            StorageMethod storageMethod,
            OpenStatus openStatus,
            LocalDate purchaseDate,
            String quantity,
            Integer originalPrice,
            Integer recommendedPrice,
            Integer quickSalePrice,
            String analysisMode,
            String modelVersion,
            String pricePolicyVersion
    ) {
        return new IngredientAnalysis(owner, ingredientName, qualityGrade, qualityReason, daysMin, daysMax,
                confidenceLevel, storageMethod, openStatus, purchaseDate, quantity, originalPrice,
                recommendedPrice, quickSalePrice, analysisMode, modelVersion, pricePolicyVersion);
    }

    public void markConsumed() {
        this.consumed = true;
    }

    public Long getId() { return id; }
    public User getOwner() { return owner; }
    public String getIngredientName() { return ingredientName; }
    public QualityGrade getQualityGrade() { return qualityGrade; }
    public String getQualityReason() { return qualityReason; }
    public Integer getEstimatedConsumptionDaysMin() { return estimatedConsumptionDaysMin; }
    public Integer getEstimatedConsumptionDaysMax() { return estimatedConsumptionDaysMax; }
    public ConfidenceLevel getConfidenceLevel() { return confidenceLevel; }
    public StorageMethod getStorageMethod() { return storageMethod; }
    public OpenStatus getOpenStatus() { return openStatus; }
    public LocalDate getPurchaseDate() { return purchaseDate; }
    public String getQuantity() { return quantity; }
    public Integer getOriginalPrice() { return originalPrice; }
    public Integer getRecommendedPrice() { return recommendedPrice; }
    public Integer getQuickSalePrice() { return quickSalePrice; }
    public String getAnalysisMode() { return analysisMode; }
    public String getModelVersion() { return modelVersion; }
    public String getPricePolicyVersion() { return pricePolicyVersion; }
    public LocalDateTime getAnalyzedAt() { return analyzedAt; }
    public boolean isConsumed() { return consumed; }
}
