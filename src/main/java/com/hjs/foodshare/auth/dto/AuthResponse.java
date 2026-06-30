package com.hjs.foodshare.auth.dto;

import com.hjs.foodshare.user.domain.User;

public record AuthResponse(
        String accessToken,
        String tokenType,
        UserResponse user
) {

    public static AuthResponse of(String accessToken, User user) {
        return new AuthResponse(
                accessToken,
                "Bearer",
                UserResponse.from(user)
        );
    }
}
