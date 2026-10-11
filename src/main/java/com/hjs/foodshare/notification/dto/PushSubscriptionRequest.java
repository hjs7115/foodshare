package com.hjs.foodshare.notification.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PushSubscriptionRequest(
        @NotBlank @Size(max = 512) String endpoint,
        @NotNull @Valid Keys keys
) {
    public record Keys(
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]+$") @Size(max = 256) String p256dh,
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]+$") @Size(max = 128) String auth
    ) {
    }
}
