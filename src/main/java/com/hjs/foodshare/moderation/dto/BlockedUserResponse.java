package com.hjs.foodshare.moderation.dto;

import com.hjs.foodshare.moderation.domain.UserBlock;
import java.time.LocalDateTime;

public record BlockedUserResponse(
        Long blockId,
        Long userId,
        String nickname,
        String profileImage,
        LocalDateTime createdAt
) {

    public static BlockedUserResponse from(UserBlock block) {
        return new BlockedUserResponse(
                block.getId(),
                block.getBlockedUser().getId(),
                block.getBlockedUser().getNickname(),
                block.getBlockedUser().getProfileImage(),
                block.getCreatedAt()
        );
    }
}
