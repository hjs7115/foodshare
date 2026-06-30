package com.hjs.foodshare.post.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.post.domain.PostStatus;
import com.hjs.foodshare.post.domain.PostType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

public record PostResponse(
        Long postId,
        Long writerId,
        String writerNickname,
        String authorNickname,
        String writerProfileImage,
        double rating,
        double freshness,
        PostType postType,
        PostStatus status,
        String title,
        String ingredientName,
        String quantity,
        Integer price,
        String priceText,
        String tradeLocation,
        String neighborhood,
        Double distanceKm,
        LocalDate expirationDate,
        long daysUntilExpiration,
        String expirationText,
        String imageUrl,
        String content,
        long commentCount,
        long favoriteCount,
        boolean favorite,
        boolean isFavorite,
        boolean isMine,
        boolean editable,
        Integer currentParticipantCount,
        Integer targetParticipantCount,
        LocalDate deadlineDate,
        Long daysUntilDeadline,
        String deadlineText,
        LocalDateTime createdAt
) {

    public static PostResponse from(Post post) {
        return from(post, null, 0, 0, 4.5, false);
    }

    public static PostResponse from(
            Post post,
            Long currentUserId,
            long commentCount,
            long favoriteCount,
            double writerRating,
            boolean favorite
    ) {
        long daysUntilExpiration = ChronoUnit.DAYS.between(LocalDate.now(), post.getExpirationDate());
        Long daysUntilDeadline = post.getDeadlineDate() == null
                ? null
                : ChronoUnit.DAYS.between(LocalDate.now(), post.getDeadlineDate());
        boolean mine = currentUserId != null && post.getWriter().getId().equals(currentUserId);
        double normalizedRating = writerRating <= 0 ? 4.5 : Math.round(writerRating * 10.0) / 10.0;

        return new PostResponse(
                post.getId(),
                post.getWriter().getId(),
                post.getWriter().getNickname(),
                post.getWriter().getNickname(),
                post.getWriter().getProfileImage(),
                normalizedRating,
                normalizedRating,
                post.getPostType(),
                post.getStatus(),
                post.getTitle(),
                post.getIngredientName(),
                post.getQuantity(),
                post.getPrice(),
                toPriceText(post.getPrice()),
                post.getTradeLocation(),
                toNeighborhood(post.getTradeLocation()),
                post.getDistanceKm(),
                post.getExpirationDate(),
                daysUntilExpiration,
                toExpirationText(daysUntilExpiration),
                post.getImageUrl(),
                post.getContent(),
                commentCount,
                favoriteCount,
                favorite,
                favorite,
                mine,
                mine,
                post.getCurrentParticipantCount(),
                post.getTargetParticipantCount(),
                post.getDeadlineDate(),
                daysUntilDeadline,
                daysUntilDeadline == null ? null : toDeadlineText(daysUntilDeadline),
                post.getCreatedAt()
        );
    }

    private static String toPriceText(Integer price) {
        if (price == null || price == 0) {
            return "Free";
        }
        return String.format("%,d KRW", price);
    }

    private static String toExpirationText(long days) {
        if (days < 0) {
            return "Expired";
        }
        if (days == 0) {
            return "Expires today";
        }
        return "Expires in " + days + " days";
    }

    private static String toDeadlineText(long days) {
        if (days < 0) {
            return "Deadline passed";
        }
        if (days == 0) {
            return "Deadline today";
        }
        return "Deadline in " + days + " days";
    }

    private static String toNeighborhood(String tradeLocation) {
        if (tradeLocation == null || tradeLocation.isBlank()) {
            return null;
        }
        String[] parts = tradeLocation.trim().split("\\s+");
        for (int index = parts.length - 1; index >= 0; index--) {
            if (parts[index].matches("[가-힣0-9]+(동|읍|면|리)$")) {
                return parts[index];
            }
        }
        return parts[parts.length - 1];
    }

    @JsonProperty("id")
    public Long id() {
        return postId;
    }

    @JsonProperty("name")
    public String name() {
        return title;
    }

    @JsonProperty("amount")
    public String amount() {
        return quantity;
    }

    @JsonProperty("image")
    public String image() {
        return imageUrl;
    }

    @JsonProperty("favorite")
    public boolean favorite() {
        return favorite;
    }

    @JsonProperty("mine")
    public boolean mine() {
        return isMine;
    }

    @JsonProperty("distanceValue")
    public Double distanceValue() {
        return distanceKm;
    }

    @JsonProperty("distance")
    public String distance() {
        if (distanceKm == null) {
            return null;
        }
        BigDecimal value = BigDecimal.valueOf(distanceKm)
                .setScale(1, RoundingMode.HALF_UP)
                .stripTrailingZeros();
        return value.toPlainString() + "km";
    }

    @JsonProperty("expiry")
    public String expiry() {
        return expirationText;
    }

    @JsonProperty("currentCount")
    public Integer currentCount() {
        return currentParticipantCount;
    }

    @JsonProperty("targetCount")
    public Integer targetCount() {
        return targetParticipantCount;
    }

    @JsonProperty("deadline")
    public String deadline() {
        return deadlineText;
    }
}
