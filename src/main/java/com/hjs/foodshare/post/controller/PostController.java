package com.hjs.foodshare.post.controller;

import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.security.AuthUser;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.post.dto.PostCreateRequest;
import com.hjs.foodshare.post.dto.PostResponse;
import com.hjs.foodshare.post.dto.PostSort;
import com.hjs.foodshare.post.dto.PostUpdateRequest;
import com.hjs.foodshare.post.service.PostService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PostResponse>> createPost(
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody PostCreateRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Post created.", postService.createPost(authUser.userId(), request)));
    }

    @PostMapping("/create")
    public ResponseEntity<ApiResponse<PostResponse>> createPostLegacy(
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody PostCreateRequest request
    ) {
        return createPost(authUser, request);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PostResponse>>> getPosts(
            @RequestParam(required = false) PostType postType,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Double maxDistanceKm,
            @RequestParam(required = false) Double radiusKm,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false, defaultValue = "LATEST") PostSort sort,
            @AuthenticationPrincipal AuthUser authUser
    ) {
        Double distanceFilter = maxDistanceKm != null ? maxDistanceKm : radiusKm;
        Long currentUserId = authUser == null ? null : authUser.userId();
        return ResponseEntity.ok(ApiResponse.ok("Posts found.",
                postService.searchPosts(postType, keyword, distanceFilter, sort, currentUserId)));
    }

    @GetMapping("/{postId}")
    public ResponseEntity<ApiResponse<PostResponse>> getPost(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthUser authUser
    ) {
        Long currentUserId = authUser == null ? null : authUser.userId();
        return ResponseEntity.ok(ApiResponse.ok("Post found.", postService.getPost(postId, currentUserId)));
    }

    @PutMapping("/{postId}")
    public ResponseEntity<ApiResponse<PostResponse>> updatePost(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody PostUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Post updated.", postService.updatePost(postId, authUser.userId(), request)));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthUser authUser
    ) {
        postService.deletePost(postId, authUser.userId());
        return ResponseEntity.ok(ApiResponse.ok("Post deleted.", null));
    }
}
