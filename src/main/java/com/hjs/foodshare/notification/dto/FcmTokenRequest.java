package com.hjs.foodshare.notification.dto;

import jakarta.validation.constraints.NotBlank;

public record FcmTokenRequest(
        @NotBlank
        String token
) {
}
