package com.hjs.foodshare.badge.controller;

import com.hjs.foodshare.badge.dto.BadgeSummaryResponse;
import com.hjs.foodshare.badge.service.BadgeService;
import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.security.AuthUser;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class BadgeController {

    private final BadgeService badgeService;

    public BadgeController(BadgeService badgeService) {
        this.badgeService = badgeService;
    }

    @GetMapping({"/badges/me", "/mypage/badges"})
    public ResponseEntity<ApiResponse<BadgeSummaryResponse>> getMyBadges(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(ApiResponse.ok("Badges found.", badgeService.getMyBadges(authUser.userId())));
    }
}
