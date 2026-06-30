package com.hjs.foodshare.favorite.controller;

import com.hjs.foodshare.favorite.dto.FavoriteResponse;
import com.hjs.foodshare.favorite.service.FavoriteService;
import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.security.AuthUser;
import com.hjs.foodshare.post.dto.PostResponse;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class FavoriteController {

    private final FavoriteService favoriteService;

    public FavoriteController(FavoriteService favoriteService) {
        this.favoriteService = favoriteService;
    }

    @PostMapping({"/posts/{postId}/favorite", "/posts/{postId}/favorites"})
    public ResponseEntity<ApiResponse<FavoriteResponse>> addFavorite(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthUser authUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Favorite added.", favoriteService.addFavorite(postId, authUser.userId())));
    }

    @DeleteMapping({"/posts/{postId}/favorite", "/posts/{postId}/favorites"})
    public ResponseEntity<ApiResponse<FavoriteResponse>> removeFavorite(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthUser authUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Favorite removed.", favoriteService.removeFavorite(postId, authUser.userId())));
    }

    @GetMapping({"/posts/{postId}/favorite", "/posts/{postId}/favorites/status"})
    public ResponseEntity<ApiResponse<FavoriteResponse>> getFavoriteStatus(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthUser authUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Favorite status found.", favoriteService.getFavoriteStatus(postId, authUser.userId())));
    }

    @GetMapping({"/favorites", "/mypage/favorites"})
    public ResponseEntity<ApiResponse<List<PostResponse>>> getMyFavorites(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(ApiResponse.ok("Favorites found.", favoriteService.getMyFavorites(authUser.userId())));
    }
}
