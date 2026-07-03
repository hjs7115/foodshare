package com.hjs.foodshare.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record FindIdVerifyRequest(
        @NotBlank(message = "name is required.")
        String name,

        @NotBlank(message = "email is required.")
        @Email(message = "email format is invalid.")
        String email,

        @NotBlank(message = "code is required.")
        String code
) {
}
