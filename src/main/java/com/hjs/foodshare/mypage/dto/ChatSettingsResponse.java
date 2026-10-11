package com.hjs.foodshare.mypage.dto;

import com.hjs.foodshare.user.domain.User;

public record ChatSettingsResponse(boolean push, boolean readReceipt, boolean hideLeftRooms) {
    public static ChatSettingsResponse from(User user) {
        return new ChatSettingsResponse(
                user.isChatPushEnabled(),
                user.isChatReadReceiptEnabled(),
                user.isHideLeftChatRooms()
        );
    }
}
