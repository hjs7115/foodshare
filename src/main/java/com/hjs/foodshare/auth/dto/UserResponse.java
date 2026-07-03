package com.hjs.foodshare.auth.dto;

import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.domain.FreshnessGrade;

public record UserResponse(
        Long userId,
        String email,
        String name,
        String nickname,
        String phoneNumber,
        String phone,
        String location,
        String profileImage,
        double freshness,
        String freshnessLevel,
        String freshnessIcon,
        String freshnessLabel
) {

    public static UserResponse from(User user) {
        double freshness = user.getFreshnessScore();
        FreshnessGrade freshnessGrade = FreshnessGrade.fromScore(freshness);
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getNickname(),
                user.getPhoneNumber(),
                user.getPhoneNumber(),
                user.getLocation(),
                user.getProfileImage(),
                freshness,
                freshnessGrade.name(),
                freshnessGrade.getIcon(),
                freshnessGrade.getLabel()
        );
    }
}
