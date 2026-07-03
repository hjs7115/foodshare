package com.hjs.foodshare.auth.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;

public record PasswordResetLinkRequest(
        @Email(message = "email format is invalid.")
        String email,

        @JsonAlias({"loginId", "userId", "id"})
        String nickname,

        String name
) {
}
