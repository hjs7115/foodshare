package com.hjs.foodshare.auth.dto;

public record PasswordResetLinkResponse(
        String email,
        long expiresInSeconds
) {
}
