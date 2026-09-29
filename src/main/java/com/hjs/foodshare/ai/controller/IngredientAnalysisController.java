package com.hjs.foodshare.ai.controller;

import com.hjs.foodshare.ai.domain.OpenStatus;
import com.hjs.foodshare.ai.domain.StorageMethod;
import com.hjs.foodshare.ai.dto.IngredientAnalysisResponse;
import com.hjs.foodshare.ai.service.IngredientAnalysisService;
import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.security.AuthUser;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/ai")
public class IngredientAnalysisController {

    private final IngredientAnalysisService ingredientAnalysisService;

    public IngredientAnalysisController(IngredientAnalysisService ingredientAnalysisService) {
        this.ingredientAnalysisService = ingredientAnalysisService;
    }

    @PostMapping(value = "/ingredient-analysis", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<IngredientAnalysisResponse>> analyzeIngredient(
            @AuthenticationPrincipal AuthUser authUser,
            @RequestParam("image") MultipartFile image,
            @RequestParam StorageMethod storageMethod,
            @RequestParam OpenStatus openStatus,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate purchaseDate,
            @RequestParam String quantity,
            @RequestParam(required = false) Integer originalPrice
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Ingredient analyzed.",
                ingredientAnalysisService.analyze(
                        authUser.userId(),
                        image,
                        storageMethod,
                        openStatus,
                        purchaseDate,
                        quantity,
                        originalPrice
                )
        ));
    }
}
