package com.hjs.foodshare.auth.dto;

public record PhoneVerificationSendResponse(
        String phoneNumber,
        int expiresInSeconds,
        String code,
        String message,
        String recipientEmail,
        String smsUri
) {
}
