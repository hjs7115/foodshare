package com.hjs.foodshare.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewCreateRequest(
        @NotNull(message = "rating is required.")
        @Min(value = 1, message = "rating must be 1 or more.")
        @Max(value = 5, message = "rating must be 5 or less.")
        Integer rating,

        @Size(max = 1000, message = "content must be 1000 characters or less.")
        String content
) {
}
