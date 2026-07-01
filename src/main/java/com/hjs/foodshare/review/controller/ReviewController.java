package com.hjs.foodshare.review.controller;

import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.response.PageResponse;
import com.hjs.foodshare.global.security.AuthUser;
import com.hjs.foodshare.review.dto.RatingSummaryResponse;
import com.hjs.foodshare.review.dto.ReviewCreateRequest;
import com.hjs.foodshare.review.dto.ReviewResponse;
import com.hjs.foodshare.review.service.ReviewService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping("/trade-requests/{requestId}/reviews")
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @PathVariable Long requestId,
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody ReviewCreateRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Review created.", reviewService.createReview(requestId, authUser.userId(), request)));
    }

    @PostMapping("/users/{userId}/reviews")
    public ResponseEntity<ApiResponse<ReviewResponse>> createReviewForUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody ReviewCreateRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Review created.", reviewService.createReviewForUser(userId, authUser.userId(), request)));
    }

    @GetMapping("/users/{userId}/reviews")
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> getReviewsForUser(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.ok("Reviews found.", reviewService.getReviewsForUser(userId)));
    }

    @GetMapping("/users/{userId}/reviews/page")
    public ResponseEntity<ApiResponse<PageResponse<ReviewResponse>>> getReviewsForUserPage(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Reviews found.",
                reviewService.getReviewsForUserPage(userId, page, size)));
    }

    @GetMapping("/users/{userId}/rating")
    public ResponseEntity<ApiResponse<RatingSummaryResponse>> getRatingSummary(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.ok("Rating summary found.", reviewService.getRatingSummary(userId)));
    }

    @GetMapping("/mypage/reviews")
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> getMyWrittenReviews(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(ApiResponse.ok("My reviews found.", reviewService.getMyWrittenReviews(authUser.userId())));
    }

    @GetMapping("/mypage/reviews/page")
    public ResponseEntity<ApiResponse<PageResponse<ReviewResponse>>> getMyWrittenReviewsPage(
            @AuthenticationPrincipal AuthUser authUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok("My reviews found.",
                reviewService.getMyWrittenReviewsPage(authUser.userId(), page, size)));
    }
}
