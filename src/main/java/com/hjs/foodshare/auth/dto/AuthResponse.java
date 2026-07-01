package com.hjs.foodshare.auth.dto;

import com.hjs.foodshare.user.domain.User;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        UserResponse user
) {

    public static AuthResponse of(String accessToken, User user) {
        return of(accessToken, null, user);
    }

    public static AuthResponse of(String accessToken, String refreshToken, User user) {
        return new AuthResponse(
                accessToken,
                refreshToken,
                "Bearer",
                UserResponse.from(user)
        );
    }
}
