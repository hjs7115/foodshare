package com.hjs.foodshare.post.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.hjs.foodshare.post.domain.PostType;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;

public record PostCreateRequest(
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

        @Size(max=10000)
        @NotBlank(message = "content is required.")
        String content,

        @Min(value = 1, message = "currentParticipantCount must be 1 or more.")
        @JsonAlias("currentCount")
        Integer currentParticipantCount,

        @Min(value = 1, message = "targetParticipantCount must be 1 or more.")
        @JsonAlias("targetCount")
        Integer targetParticipantCount,

        @JsonAlias("deadline")
        Object deadlineDate,

        Long analysisId
) {
    public PostCreateRequest(
            PostType postType,
            String title,
            String ingredientName,
            String quantity,
            Object price,
            String tradeLocation,
            Double distanceKm,
            Double latitude,
            Double longitude,
            Object expirationDate,
            String imageUrl,
            String content,
            Integer currentParticipantCount,
            Integer targetParticipantCount,
            Object deadlineDate
    ) {
        this(postType, title, ingredientName, quantity, price, tradeLocation, distanceKm, latitude, longitude,
                expirationDate, imageUrl, content, currentParticipantCount, targetParticipantCount, deadlineDate, null);
    }

    public PostCreateRequest {
        if (ingredientName == null || ingredientName.isBlank()) {
            ingredientName = title;
        }
        if (price == null) {
            price = postType==PostType.SHARE?0:"가격미정";
        }
        if (tradeLocation == null || tradeLocation.isBlank()) {
            tradeLocation = "거래 위치 미정";
        }
        if (expirationDate == null || (expirationDate instanceof String date && date.isBlank())) {
            // A BUY post has no ingredient expiry; use its requested purchase deadline instead.
            LocalDateTime purchaseDeadline = postType == PostType.BUY ? PostValues.deadline(deadlineDate) : null;
            expirationDate = purchaseDeadline == null
                    ? LocalDate.now(java.time.ZoneId.of("Asia/Seoul")).plusDays(7)
                    : purchaseDeadline.toLocalDate();
        }
        if (content == null || content.isBlank()) {
            content = title;
        }
    }

    public Integer priceValue() { return PostValues.price(price); }
    public boolean priceNegotiable() { return PostValues.negotiable(price); }
    public LocalDate expirationDateValue() { return PostValues.expiration(expirationDate); }
    public LocalDateTime deadlineDateValue() { return PostValues.deadline(deadlineDate); }

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
                return LocalDateTime.parse(text.matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}") ? text + ":00" : text);
            } catch (DateTimeParseException ignored) {
                try {
                    return LocalDate.parse(text).atTime(23, 0);
                } catch (DateTimeParseException exception) {
                    return defaultValue;
                }
            }
        }
        return defaultValue;
    }

}
