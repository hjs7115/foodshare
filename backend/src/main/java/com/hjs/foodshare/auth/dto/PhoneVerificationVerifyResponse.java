package com.hjs.foodshare.auth.dto;

public record PhoneVerificationVerifyResponse(
        String phoneNumber,
        boolean verified
) {
}
