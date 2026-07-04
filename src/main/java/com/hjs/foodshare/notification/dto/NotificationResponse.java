package com.hjs.foodshare.notification.dto;

import com.hjs.foodshare.notification.domain.Notification;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.trade.domain.TradeRequest;
import com.hjs.foodshare.user.domain.FreshnessGrade;
import com.hjs.foodshare.user.domain.User;
import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        String type,
        String title,
        String message,
        String targetType,
        Long targetId,
        Long postId,
        PostType postType,
        Long requesterId,
        String requesterNickname,
        String requesterProfileImage,
        Double requesterFreshness,
        String requesterFreshnessLevel,
        String requesterFreshnessIcon,
        String requesterFreshnessLabel,
        long requesterShareCompletedCount,
        long requesterReceivedShareCount,
        long requesterGroupBuyCount,
        boolean read,
        LocalDateTime createdAt
) {
    public static NotificationResponse from(Notification notification) {
        return from(notification, null, 0, 0, 0);
    }

    public static NotificationResponse from(
            Notification notification,
            TradeRequest tradeRequest,
            long requesterShareCompletedCount,
            long requesterReceivedShareCount,
            long requesterGroupBuyCount
    ) {
        User requester = tradeRequest == null ? null : tradeRequest.getRequester();
        Double freshness = requester == null ? null : requester.getFreshnessScore();
        FreshnessGrade freshnessGrade = freshness == null ? null : FreshnessGrade.fromScore(freshness);
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getTargetType(),
                notification.getTargetId(),
                tradeRequest == null ? null : tradeRequest.getPost().getId(),
                tradeRequest == null ? null : tradeRequest.getPost().getPostType(),
                requester == null ? null : requester.getId(),
                requester == null ? null : requester.getNickname(),
                requester == null ? null : requester.getProfileImage(),
                freshness,
                freshnessGrade == null ? null : freshnessGrade.name(),
                freshnessGrade == null ? null : freshnessGrade.getIcon(),
                freshnessGrade == null ? null : freshnessGrade.getLabel(),
                requesterShareCompletedCount,
                requesterReceivedShareCount,
                requesterGroupBuyCount,
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}
