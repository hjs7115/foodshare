package com.hjs.foodshare.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "email is required.")
        @Email(message = "email format is invalid.")
        String email,

        @NotBlank(message = "newPassword is required.")
        @Size(min = 8, message = "newPassword must be at least 8 characters.")
        String newPassword
) {
}
