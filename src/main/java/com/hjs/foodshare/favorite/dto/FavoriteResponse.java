package com.hjs.foodshare.favorite.dto;

public record FavoriteResponse(
        Long postId,
        boolean favorite,
        boolean isFavorite,
        long favoriteCount
) {
}
