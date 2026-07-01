package com.hjs.foodshare.notification.service;

import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.notification.domain.Notification;
import com.hjs.foodshare.notification.dto.FcmTokenRequest;
import com.hjs.foodshare.notification.dto.NotificationResponse;
import com.hjs.foodshare.notification.dto.NotificationSettingsRequest;
import com.hjs.foodshare.notification.dto.NotificationSettingsResponse;
import com.hjs.foodshare.notification.dto.TestPushRequest;
import com.hjs.foodshare.notification.repository.NotificationRepository;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class NotificationService {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final FcmPushService fcmPushService;

    public NotificationService(UserRepository userRepository, NotificationRepository notificationRepository,
                               FcmPushService fcmPushService) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.fcmPushService = fcmPushService;
    }

    public NotificationSettingsResponse getSettings(Long userId) {
        return NotificationSettingsResponse.from(getUser(userId));
    }

    @Transactional
    public NotificationSettingsResponse updateSettings(Long userId, NotificationSettingsRequest request) {
        User user = getUser(userId);
        user.updateNotificationSettings(
                valueOrCurrent(request.newPost(), user.isNotificationNewPost()),
                valueOrCurrent(request.comment(), user.isNotificationComment()),
                valueOrCurrent(request.tradeRequest(), user.isNotificationTradeRequest()),
                valueOrCurrent(request.tradeAccepted(), user.isNotificationTradeAccepted()),
                valueOrCurrent(request.marketing(), user.isNotificationMarketing())
        );
        return NotificationSettingsResponse.from(user);
    }

    public List<NotificationResponse> getNotifications(Long userId) {
        getUser(userId);
        return notificationRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(NotificationResponse::from)
                .toList();
    }

    @Transactional
    public void markAsRead(Long userId, Long notificationId) {
        getUser(userId);
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Notification not found."));
        if (!notification.getUser().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only the notification owner can read it.");
        }
        notification.markAsRead();
    }

    @Transactional
    public void registerFcmToken(Long userId, FcmTokenRequest request) {
        User user = getUser(userId);
        user.updateFcmToken(request.token());
    }

    @Transactional
    public void createNotification(Long userId, String type, String title, String message) {
        User user = getUser(userId);
        notificationRepository.save(Notification.create(user, type, title, message));
        fcmPushService.sendPush(user.getFcmToken(), title, message);
    }

    @Transactional
    public boolean sendTestPush(Long userId, TestPushRequest request) {
        User user = getUser(userId);
        String title = request == null ? "FoodShare 테스트 알림" : request.titleValue();
        String message = request == null
                ? "브라우저 푸시 알림 설정이 정상적으로 연결되었습니다."
                : request.messageValue();

        notificationRepository.save(Notification.create(user, "TEST_PUSH", title, message));
        return fcmPushService.sendPush(user.getFcmToken(), title, message);
    }

    private boolean valueOrCurrent(Boolean value, boolean current) {
        return value == null ? current : value;
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));
    }
}
