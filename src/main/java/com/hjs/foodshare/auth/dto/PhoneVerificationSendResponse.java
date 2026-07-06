package com.hjs.foodshare.auth.dto;

public record PhoneVerificationSendResponse(
        String phoneNumber,
        int expiresInSeconds
) {
}
