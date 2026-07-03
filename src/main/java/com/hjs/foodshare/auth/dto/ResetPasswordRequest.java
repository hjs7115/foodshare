package com.hjs.foodshare.auth.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @Email(message = "email format is invalid.")
        String email,

        @JsonAlias({"loginId", "userId", "id"})
        String nickname,

        String name,

        @NotBlank(message = "code is required.")
        String code,

        @NotBlank(message = "newPassword is required.")
        @Size(min = 8, message = "newPassword must be at least 8 characters.")
        String newPassword
) {
}
