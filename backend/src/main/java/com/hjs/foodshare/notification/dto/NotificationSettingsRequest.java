package com.hjs.foodshare.notification.dto;

public record NotificationSettingsRequest(
        Boolean newPost,
        Boolean comment,
        Boolean tradeRequest,
        Boolean tradeAccepted,
        Boolean marketing
) {
}
