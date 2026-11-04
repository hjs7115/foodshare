package com.hjs.foodshare.notification.service;

import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.global.response.PageResponse;
import com.hjs.foodshare.notification.domain.Notification;
import com.hjs.foodshare.notification.domain.UserFcmToken;
import com.hjs.foodshare.notification.dto.NotificationResponse;
import com.hjs.foodshare.notification.dto.NotificationSettingsRequest;
import com.hjs.foodshare.notification.dto.NotificationSettingsResponse;
import com.hjs.foodshare.notification.dto.FcmTokenRequest;
import com.hjs.foodshare.notification.dto.TestPushRequest;
import com.hjs.foodshare.notification.dto.UnreadNotificationCountResponse;
import com.hjs.foodshare.notification.repository.NotificationRepository;
import com.hjs.foodshare.notification.repository.UserFcmTokenRepository;
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

    @org.springframework.beans.factory.annotation.Autowired private PushRetryService retries;
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager em;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final UserFcmTokenRepository userFcmTokenRepository;
    private final TradeRequestRepository tradeRequestRepository;
    private final FcmPushService fcmPushService;

    public NotificationService(UserRepository userRepository, NotificationRepository notificationRepository,
                               UserFcmTokenRepository userFcmTokenRepository,
                               TradeRequestRepository tradeRequestRepository, FcmPushService fcmPushService) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.userFcmTokenRepository = userFcmTokenRepository;
        this.tradeRequestRepository = tradeRequestRepository;
        this.fcmPushService = fcmPushService;
    }

    public NotificationSettingsResponse getSettings(Long userId) {
        return NotificationSettingsResponse.from(getUser(userId));
    }

    @Transactional
    public NotificationSettingsResponse updateSettings(Long userId, NotificationSettingsRequest request) {
        User user = getUser(userId);
        user.setExpiryReminder(request.expiryReminder());
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
        var result=notificationRepository.findAllByUserIdOrderByCreatedAtDesc(userId,org.springframework.data.domain.PageRequest.of(Math.max(0,page),Math.min(100,Math.max(1,size))));
        return new PageResponse<>(result.getContent().stream().map(this::toResponse).toList(),result.getNumber(),result.getSize(),result.getTotalElements(),result.getTotalPages(),result.isFirst(),result.isLast());
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
                .orElse(null);
        if (notification == null) {
            return;
        }
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
    public void deleteAllNotifications(Long userId) {
        getUser(userId);
        notificationRepository.deleteAllOwned(userId);
    }

    @Transactional
    public void registerFcmToken(Long userId, FcmTokenRequest request) {
        User user = getUser(userId);
        userFcmTokenRepository.findByToken(request.token())
                .ifPresentOrElse(
                        existing -> existing.moveTo(user),
                        () -> userFcmTokenRepository.save(UserFcmToken.create(user, request.token()))
                );
    }

    @Transactional
    public void removeFcmToken(Long userId, String token) {
        getUser(userId);
        userFcmTokenRepository.deleteByTokenAndUser_Id(token, userId);
    }

    @Transactional
    public void createNotification(Long userId, String type, String title, String message) {
        createNotification(userId, type, title, message, null, null);
    }

    @Transactional
    public void createNotification(Long userId, String type, String title, String message, String targetType, Long targetId) {
        User user = getUser(userId);
        notificationRepository.save(Notification.create(user, type, title, message, targetType, targetId));
        sendPushToUser(userId, type, title, message, targetType, targetId);
    }

    @Transactional
    public void sendPushOnly(Long userId, String type, String title, String message, String targetType, Long targetId) {
        User user = getUser(userId);
        sendPushToUser(userId, type, title, message, targetType, targetId);
    }

    @Transactional
    public void sendChatPush(Long userId,Long senderId,String title,String body,Long roomId,Long messageId){
        User user=getUser(userId);if(!user.isAvailable()||!user.isChatPushEnabled())return;
        for(UserFcmToken token:userFcmTokenRepository.findAllByUser_Id(userId))retries.enqueueChat(userId,token.getId(),senderId,messageId,title,body,roomId);
    }

    @Transactional
    public boolean sendTestPush(Long userId, TestPushRequest request) {
        User user = getUser(userId);
        String title = request == null ? "FoodShare 테스트 알림" : request.titleValue();
        String message = request == null
                ? "브라우저 푸시 알림 설정이 정상적으로 연결되었습니다."
                : request.messageValue();

        notificationRepository.save(Notification.create(user, "TEST_PUSH", title, message));
        return fcmPushService.isEnabled() && sendPushToUser(userId, "TEST_PUSH", title, message, null, null);
    }

    private boolean sendPushToUser(Long userId, String type, String title, String body,
                                   String targetType, Long targetId) {
        User user=getUser(userId);
        if (!user.isAvailable() || ("CHAT_MESSAGE".equals(type) && !user.isChatPushEnabled())) return false;
        boolean queued=false;
        for (UserFcmToken token:userFcmTokenRepository.findAllByUser_Id(userId)) {
            retries.enqueue(userId,token.getId(),type,title,body,targetType,targetId); queued=true;
        }
        return queued;
    }

    @Transactional
    public void notifyNearbyPost(com.hjs.foodshare.post.domain.Post post) {
        if(post.getLatitude()==null || post.getLongitude()==null || post.isOpenFridgePost()) return;
        var users=em.createQuery("select u from User u where u.id<>:id and coalesce(u.suspended,false)=false and u.withdrawnAt is null and coalesce(u.notificationNewPost,true)=true and u.latitude between :low and :high and u.longitude is not null and not exists(select b.id from UserBlock b where (b.blocker.id=u.id and b.blockedUser.id=:id) or (b.blocker.id=:id and b.blockedUser.id=u.id))",User.class)
            .setParameter("id",post.getWriter().getId()).setParameter("low",post.getLatitude()-0.046).setParameter("high",post.getLatitude()+0.046).getResultList();
        for(User u:users){
            double x=Math.toRadians(post.getLatitude()-u.getLatitude()),y=Math.toRadians(post.getLongitude()-u.getLongitude());
            double h=Math.sin(x/2)*Math.sin(x/2)+Math.cos(Math.toRadians(post.getLatitude()))*Math.cos(Math.toRadians(u.getLatitude()))*Math.sin(y/2)*Math.sin(y/2);
            if(6371*2*Math.asin(Math.sqrt(Math.min(1,h)))<=5) createNotification(u.getId(),"NEW_POST","동네 새 게시글",post.getTitle(),"POST",post.getId());
        }
    }

    private boolean valueOrCurrent(Boolean value, boolean current) {
        return value == null ? current : value;
    }

    static Map<String, String> pushData(String type, String targetType, Long targetId) {
        Map<String, String> data = new HashMap<>();
        data.put("type", type == null ? "" : type);
        data.put("targetType", targetType == null ? "" : targetType);
        data.put("targetId", targetId == null ? "" : String.valueOf(targetId));
        data.put("clickAction", clickAction(type, targetType, targetId));
        return data;
    }

    private static String clickAction(String type, String targetType, Long targetId) {
        if ("SHOPPING".equals(targetType)) return "/app?screen=fridge&shopping=1"+(targetId==null?"":"&shoppingWeek="+java.time.LocalDate.ofEpochDay(targetId));
        if ("FRIDGE_EXCHANGE".equals(targetType)) return "/app?screen=fridge&exchange=1";
        if ("CHAT_ROOM".equals(targetType) && targetId != null) {
            return "/app?screen=chat&roomId=" + targetId;
        }
        if ("TRADE_REQUEST".equals(targetType)) {
            return "/app?screen=tradeHistory";
        }
        if ("POST".equals(targetType) && targetId != null) {
            return "/app?screen=post&postId=" + targetId;
        }
        if ("REPORT".equals(targetType)) return "/app?screen=profile&reports=1";
        if ("COMMENT".equals(type)) {
            return "/app?screen=notifications";
        }
        if ("REVIEW".equals(type) || "RATING".equals(type)) {
            return "/app?screen=profile&ratings=1";
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
        return tradeRequestRepository.countDistinctPostsByRequesterOrWriterAndPostTypeAndStatus(
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
