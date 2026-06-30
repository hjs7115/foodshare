package com.hjs.foodshare.auth.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;

public record PhoneVerificationSendRequest(
        @JsonAlias("phone")
        @NotBlank(message = "phoneNumber is required.")
        String phoneNumber
) {
}
