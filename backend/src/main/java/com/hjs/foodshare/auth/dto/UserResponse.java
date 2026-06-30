package com.hjs.foodshare.auth.dto;

import com.hjs.foodshare.user.domain.User;

public record UserResponse(
        Long userId,
        String email,
        String name,
        String nickname,
        String phoneNumber,
        String phone,
        String location,
        String profileImage
) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getNickname(),
                user.getPhoneNumber(),
                user.getPhoneNumber(),
                user.getLocation(),
                user.getProfileImage()
        );
    }
}
