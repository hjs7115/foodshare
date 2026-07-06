package com.hjs.foodshare.notification.service;

import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.global.response.PageResponse;
import com.hjs.foodshare.notification.domain.Notification;
import com.hjs.foodshare.notification.dto.FcmTokenRequest;
import com.hjs.foodshare.notification.dto.NotificationResponse;
import com.hjs.foodshare.notification.dto.NotificationSettingsRequest;
import com.hjs.foodshare.notification.dto.NotificationSettingsResponse;
import com.hjs.foodshare.notification.dto.TestPushRequest;
import com.hjs.foodshare.notification.dto.UnreadNotificationCountResponse;
import com.hjs.foodshare.notification.repository.NotificationRepository;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.trade.domain.TradeRequestStatus;
import com.hjs.foodshare.trade.repository.TradeRequestRepository;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class NotificationService {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final TradeRequestRepository tradeRequestRepository;
    private final FcmPushService fcmPushService;

    public NotificationService(UserRepository userRepository, NotificationRepository notificationRepository,
                               TradeRequestRepository tradeRequestRepository, FcmPushService fcmPushService) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.tradeRequestRepository = tradeRequestRepository;
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
                .map(this::toResponse)
                .toList();
    }

    public PageResponse<NotificationResponse> getNotificationsPage(Long userId, int page, int size) {
        return PageResponse.of(getNotifications(userId), page, size);
    }

    public UnreadNotificationCountResponse getUnreadCount(Long userId) {
        getUser(userId);
        return new UnreadNotificationCountResponse(notificationRepository.countByUserIdAndReadFalse(userId));
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
    public void deleteNotification(Long userId, Long notificationId) {
        getUser(userId);
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Notification not found."));
        if (!notification.getUser().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only the notification owner can delete it.");
        }
        notificationRepository.delete(notification);
    }

    @Transactional
    public void deleteReadNotifications(Long userId) {
        getUser(userId);
        notificationRepository.deleteAll(notificationRepository.findAllByUserIdAndReadTrue(userId));
    }

    @Transactional
    public void registerFcmToken(Long userId, FcmTokenRequest request) {
        User user = getUser(userId);
        user.updateFcmToken(request.token());
    }

    @Transactional
    public void createNotification(Long userId, String type, String title, String message) {
        createNotification(userId, type, title, message, null, null);
    }

    @Transactional
    public void createNotification(Long userId, String type, String title, String message, String targetType, Long targetId) {
        User user = getUser(userId);
        notificationRepository.save(Notification.create(user, type, title, message, targetType, targetId));
        clearInvalidFcmTokenIfNeeded(user, fcmPushService.sendPush(
                user.getFcmToken(),
                title,
                message,
                pushData(type, targetType, targetId)
        ));
    }

    @Transactional
    public void sendPushOnly(Long userId, String type, String title, String message, String targetType, Long targetId) {
        User user = getUser(userId);
        clearInvalidFcmTokenIfNeeded(user, fcmPushService.sendPush(
                user.getFcmToken(),
                title,
                message,
                pushData(type, targetType, targetId)
        ));
    }

    @Transactional
    public boolean sendTestPush(Long userId, TestPushRequest request) {
        User user = getUser(userId);
        String title = request == null ? "FoodShare 테스트 알림" : request.titleValue();
        String message = request == null
                ? "브라우저 푸시 알림 설정이 정상적으로 연결되었습니다."
                : request.messageValue();

        notificationRepository.save(Notification.create(user, "TEST_PUSH", title, message));
        boolean pushed = fcmPushService.sendPush(user.getFcmToken(), title, message);
        clearInvalidFcmTokenIfNeeded(user, pushed);
        return pushed;
    }

    private void clearInvalidFcmTokenIfNeeded(User user, boolean pushed) {
        if (fcmPushService.isEnabled() && !pushed && user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
            user.clearFcmToken();
        }
    }

    private boolean valueOrCurrent(Boolean value, boolean current) {
        return value == null ? current : value;
    }

    private Map<String, String> pushData(String type, String targetType, Long targetId) {
        Map<String, String> data = new HashMap<>();
        data.put("type", type == null ? "" : type);
        data.put("targetType", targetType == null ? "" : targetType);
        data.put("targetId", targetId == null ? "" : String.valueOf(targetId));
        data.put("clickAction", clickAction(type, targetType, targetId));
        return data;
    }

    private String clickAction(String type, String targetType, Long targetId) {
        if ("CHAT_ROOM".equals(targetType) && targetId != null) {
            return "/?screen=chat&roomId=" + targetId;
        }
        if ("TRADE_REQUEST".equals(targetType)) {
            return "/?screen=tradeHistory";
        }
        if ("POST".equals(targetType) && targetId != null) {
            return "/?screen=post&postId=" + targetId;
        }
        if ("COMMENT".equals(type)) {
            return "/?screen=notifications";
        }
        if ("REVIEW".equals(type) || "RATING".equals(type)) {
            return "/?screen=profile";
        }
        return "/";
    }

    private NotificationResponse toResponse(Notification notification) {
        if (!"TRADE_REQUEST".equals(notification.getTargetType()) || notification.getTargetId() == null) {
            return NotificationResponse.from(notification);
        }

        return tradeRequestRepository.findById(notification.getTargetId())
                .map(tradeRequest -> NotificationResponse.from(
                        notification,
                        tradeRequest,
                        countShareCompleted(tradeRequest.getRequester().getId()),
                        countReceivedShare(tradeRequest.getRequester().getId()),
                        countGroupBuyParticipation(tradeRequest.getRequester().getId())
                ))
                .orElseGet(() -> NotificationResponse.from(notification));
    }

    private long countShareCompleted(Long userId) {
        return tradeRequestRepository.countByPostWriterIdAndPostTypeAndStatus(
                userId,
                PostType.SHARE,
                TradeRequestStatus.COMPLETED
        );
    }

    private long countReceivedShare(Long userId) {
        return tradeRequestRepository.countByRequesterIdAndPostTypeAndStatus(
                userId,
                PostType.SHARE,
                TradeRequestStatus.COMPLETED
        );
    }

    private long countGroupBuyParticipation(Long userId) {
        return tradeRequestRepository.countByRequesterIdAndPostTypeAndStatus(
                userId,
                PostType.GROUP_BUY,
                TradeRequestStatus.COMPLETED
        );
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));
    }
}
