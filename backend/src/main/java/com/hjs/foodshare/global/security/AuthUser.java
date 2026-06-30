package com.hjs.foodshare.global.security;

public record AuthUser(
        Long userId,
        String email,
        String nickname
) {
}
