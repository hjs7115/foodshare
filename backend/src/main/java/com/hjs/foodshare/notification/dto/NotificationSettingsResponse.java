package com.hjs.foodshare.notification.dto;

import com.hjs.foodshare.user.domain.User;

public record NotificationSettingsResponse(
        boolean newPost,
        boolean comment,
        boolean tradeRequest,
        boolean tradeAccepted,
        boolean marketing
) {

    public static NotificationSettingsResponse from(User user) {
        return new NotificationSettingsResponse(
                user.isNotificationNewPost(),
                user.isNotificationComment(),
                user.isNotificationTradeRequest(),
                user.isNotificationTradeAccepted(),
                user.isNotificationMarketing()
        );
    }
}
