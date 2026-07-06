package com.hjs.foodshare.post.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.hjs.foodshare.post.domain.PostType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;

public record PostUpdateRequest(
        @NotNull(message = "postType is required.")
        PostType postType,

        @NotBlank(message = "title is required.")
        @Size(max = 100, message = "title must be 100 characters or less.")
        String title,

        @NotBlank(message = "ingredientName is required.")
        @Size(max = 100, message = "ingredientName must be 100 characters or less.")
        String ingredientName,

        @NotBlank(message = "quantity is required.")
        @Size(max = 50, message = "quantity must be 50 characters or less.")
        @JsonAlias("amount")
        String quantity,

        @NotNull(message = "price is required.")
        Object price,

        @NotBlank(message = "tradeLocation is required.")
        @Size(max = 100, message = "tradeLocation must be 100 characters or less.")
        @JsonAlias({"location", "address"})
        String tradeLocation,

        Double distanceKm,

        @JsonAlias("lat")
        Double latitude,

        @JsonAlias("lng")
        Double longitude,

        @JsonAlias("expiry")
        Object expirationDate,

        @JsonAlias("image")
        String imageUrl,

        @NotBlank(message = "content is required.")
        String content,

        @Min(value = 1, message = "currentParticipantCount must be 1 or more.")
        @JsonAlias("currentCount")
        Integer currentParticipantCount,

        @Min(value = 1, message = "targetParticipantCount must be 1 or more.")
        @JsonAlias("targetCount")
        Integer targetParticipantCount,

        @JsonAlias("deadline")
        Object deadlineDate
) {
    public PostUpdateRequest {
        if (ingredientName == null || ingredientName.isBlank()) {
            ingredientName = title;
        }
        if (price == null) {
            price = 0;
        }
        if (tradeLocation == null || tradeLocation.isBlank()) {
            tradeLocation = "거래 위치 미정";
        }
        if (expirationDate == null) {
            expirationDate = LocalDate.now().plusDays(7);
        }
        if (content == null || content.isBlank()) {
            content = title;
        }
    }

    public Integer priceValue() {
        if (price instanceof Number number) {
            return Math.max(number.intValue(), 0);
        }
        if (price instanceof String text) {
            String digits = text.replaceAll("[^0-9-]", "");
            if (digits.isBlank() || "-".equals(digits)) {
                return 0;
            }
            return Math.max(Integer.parseInt(digits), 0);
        }
        return 0;
    }

    public LocalDate expirationDateValue() {
        return toDateOrDefault(expirationDate, LocalDate.now().plusDays(7));
    }

    public LocalDateTime deadlineDateValue() {
        return toDateTimeOrDefault(deadlineDate, null);
    }

    public String imageUrlValue() {
        return ImageUrlNormalizer.normalize(imageUrl);
    }

    private LocalDate toDateOrDefault(Object value, LocalDate defaultValue) {
        if (value instanceof LocalDate date) {
            return date;
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return LocalDate.parse(text);
            } catch (DateTimeParseException exception) {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    private LocalDateTime toDateTimeOrDefault(Object value, LocalDateTime defaultValue) {
        if (value instanceof LocalDateTime dateTime) {
            return dateTime;
        }
        if (value instanceof LocalDate date) {
            return date.atTime(23, 59);
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return LocalDateTime.parse(text);
            } catch (DateTimeParseException ignored) {
                try {
                    return LocalDate.parse(text).atTime(23, 59);
                } catch (DateTimeParseException exception) {
                    return defaultValue;
                }
            }
        }
        return defaultValue;
    }
}
