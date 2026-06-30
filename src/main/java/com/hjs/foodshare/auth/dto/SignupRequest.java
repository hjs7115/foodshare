package com.hjs.foodshare.auth.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank(message = "name is required.")
        String name,

        @NotBlank(message = "nickname is required.")
        @Size(max = 50, message = "nickname must be 50 characters or less.")
        String nickname,

        @NotBlank(message = "email is required.")
        @Email(message = "email format is invalid.")
        String email,

        @NotBlank(message = "password is required.")
        @Size(min = 8, message = "password must be at least 8 characters.")
        String password,

        @NotBlank(message = "phoneNumber is required.")
        @JsonAlias("phone")
        String phoneNumber,

        @JsonAlias("address")
        String location
) {
}
