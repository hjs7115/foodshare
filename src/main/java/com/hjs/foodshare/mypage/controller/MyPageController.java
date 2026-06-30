package com.hjs.foodshare.mypage.controller;

import com.hjs.foodshare.comment.dto.CommentResponse;
import com.hjs.foodshare.auth.dto.UserResponse;
import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.security.AuthUser;
import com.hjs.foodshare.mypage.dto.LocationResponse;
import com.hjs.foodshare.mypage.dto.LocationUpdateRequest;
import com.hjs.foodshare.mypage.dto.MyPageResponse;
import com.hjs.foodshare.mypage.dto.ProfileUpdateRequest;
import com.hjs.foodshare.mypage.service.MyPageService;
import com.hjs.foodshare.post.dto.PostResponse;
import com.hjs.foodshare.trade.dto.TradeRequestResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mypage")
public class MyPageController {

    private final MyPageService myPageService;

    public MyPageController(MyPageService myPageService) {
        this.myPageService = myPageService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<MyPageResponse>> getMyPage(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(ApiResponse.ok("My page found.", myPageService.getMyPage(authUser.userId())));
    }

    @GetMapping("/posts")
    public ResponseEntity<ApiResponse<List<PostResponse>>> getMyPosts(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(ApiResponse.ok("My posts found.", myPageService.getMyPosts(authUser.userId())));
    }

    @GetMapping("/comments")
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getMyComments(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(ApiResponse.ok("My comments found.", myPageService.getMyComments(authUser.userId())));
    }

    @GetMapping("/trade-requests")
    public ResponseEntity<ApiResponse<List<TradeRequestResponse>>> getMyTradeRequests(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(ApiResponse.ok("My trade requests found.", myPageService.getMyTradeRequests(authUser.userId())));
    }

    @GetMapping("/received-trade-requests")
    public ResponseEntity<ApiResponse<List<TradeRequestResponse>>> getReceivedTradeRequests(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(ApiResponse.ok("Received trade requests found.", myPageService.getReceivedTradeRequests(authUser.userId())));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody ProfileUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Profile updated.", myPageService.updateProfile(authUser.userId(), request)));
    }

    @PutMapping("/location")
    public ResponseEntity<ApiResponse<LocationResponse>> updateLocation(
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody LocationUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Location updated.", myPageService.updateLocation(authUser.userId(), request)));
    }
}
