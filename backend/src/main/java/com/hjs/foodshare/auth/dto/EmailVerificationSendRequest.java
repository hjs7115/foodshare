package com.hjs.foodshare.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record EmailVerificationSendRequest(
        @NotBlank(message = "email is required.")
        @Email(message = "email format is invalid.")
        String email
) {
}
