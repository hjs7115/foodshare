package com.hjs.foodshare.notification.controller;

import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.security.AuthUser;
import com.hjs.foodshare.notification.dto.FcmTokenRequest;
import com.hjs.foodshare.notification.dto.NotificationResponse;
import com.hjs.foodshare.notification.dto.NotificationSettingsRequest;
import com.hjs.foodshare.notification.dto.NotificationSettingsResponse;
import com.hjs.foodshare.notification.dto.TestPushRequest;
import com.hjs.foodshare.notification.service.NotificationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/api/mypage/notifications/settings")
    public ResponseEntity<ApiResponse<NotificationSettingsResponse>> getSettings(
            @AuthenticationPrincipal AuthUser authUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Notification settings found.", notificationService.getSettings(authUser.userId())));
    }

    @PutMapping("/api/mypage/notifications/settings")
    public ResponseEntity<ApiResponse<NotificationSettingsResponse>> updateSettings(
            @AuthenticationPrincipal AuthUser authUser,
            @RequestBody NotificationSettingsRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Notification settings updated.", notificationService.updateSettings(authUser.userId(), request)));
    }

    @GetMapping("/api/notifications")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getNotifications(
            @AuthenticationPrincipal AuthUser authUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Notifications found.", notificationService.getNotifications(authUser.userId())));
    }

    @RequestMapping(
            value = "/api/notifications/{notificationId}/read",
            method = {RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH}
    )
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal AuthUser authUser
    ) {
        notificationService.markAsRead(authUser.userId(), notificationId);
        return ResponseEntity.ok(ApiResponse.ok("Notification read.", null));
    }

    @PostMapping("/api/notifications/fcm-token")
    public ResponseEntity<ApiResponse<Void>> registerFcmToken(
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody FcmTokenRequest request
    ) {
        notificationService.registerFcmToken(authUser.userId(), request);
        return ResponseEntity.ok(ApiResponse.ok("FCM token registered.", null));
    }

    @PostMapping("/api/notifications/test-push")
    public ResponseEntity<ApiResponse<Boolean>> sendTestPush(
            @AuthenticationPrincipal AuthUser authUser,
            @RequestBody(required = false) TestPushRequest request
    ) {
        boolean pushed = notificationService.sendTestPush(authUser.userId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Test notification created.", pushed));
    }
}
