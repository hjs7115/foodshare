package com.hjs.foodshare.auth.dto;

public record EmailVerificationVerifyResponse(
        String email,
        boolean verified
) {
}
