package com.hjs.foodshare.chat.dto;

import com.hjs.foodshare.user.domain.User;

public record ChatParticipantResponse(
        Long userId,
        String nickname,
        String profileImage
) {
    public static ChatParticipantResponse from(User user) {
        return new ChatParticipantResponse(
                user.getId(),
                user.getNickname(),
                user.getProfileImage()
        );
    }
}
