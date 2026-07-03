package com.hjs.foodshare.moderation.controller;

import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.security.AuthUser;
import com.hjs.foodshare.moderation.dto.BlockedUserResponse;
import com.hjs.foodshare.moderation.dto.ReportCreateRequest;
import com.hjs.foodshare.moderation.dto.ReportResponse;
import com.hjs.foodshare.moderation.service.ModerationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ModerationController {

    private final ModerationService moderationService;

    public ModerationController(ModerationService moderationService) {
        this.moderationService = moderationService;
    }

    @PostMapping("/reports")
    public ResponseEntity<ApiResponse<ReportResponse>> createReport(
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody ReportCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Report created.", moderationService.createReport(authUser.userId(), request)));
    }

    @GetMapping("/reports/me")
    public ResponseEntity<ApiResponse<List<ReportResponse>>> getMyReports(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(ApiResponse.ok("Reports found.", moderationService.getMyReports(authUser.userId())));
    }

    @PostMapping("/users/{userId}/block")
    public ResponseEntity<ApiResponse<BlockedUserResponse>> blockUser(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long userId
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("User blocked.", moderationService.blockUser(authUser.userId(), userId)));
    }

    @DeleteMapping("/users/{userId}/block")
    public ResponseEntity<ApiResponse<Void>> unblockUser(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long userId
    ) {
        moderationService.unblockUser(authUser.userId(), userId);
        return ResponseEntity.ok(ApiResponse.ok("User unblocked.", null));
    }

    @GetMapping({"/users/blocks", "/mypage/blocks", "/mypage/blocked-users"})
    public ResponseEntity<ApiResponse<List<BlockedUserResponse>>> getBlockedUsers(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(ApiResponse.ok("Blocked users found.", moderationService.getBlockedUsers(authUser.userId())));
    }
}
