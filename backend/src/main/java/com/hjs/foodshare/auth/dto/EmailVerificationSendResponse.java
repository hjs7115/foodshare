package com.hjs.foodshare.auth.dto;

public record EmailVerificationSendResponse(
        String email,
        int expiresInSeconds
) {
}
