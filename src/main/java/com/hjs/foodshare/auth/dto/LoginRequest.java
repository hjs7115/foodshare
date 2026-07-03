package com.hjs.foodshare.auth.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "loginId is required.")
        @JsonAlias({"nickname", "userId", "id", "email"})
        String loginId,

        @NotBlank(message = "password is required.")
        String password
) {
    public String loginIdValue() {
        return loginId.trim();
    }
}
