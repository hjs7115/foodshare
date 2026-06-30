package com.hjs.foodshare.auth.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;

public record FindEmailRequest(
        @NotBlank(message = "name is required.")
        String name,

        @NotBlank(message = "phoneNumber is required.")
        @JsonAlias("phone")
        String phoneNumber
) {
}
