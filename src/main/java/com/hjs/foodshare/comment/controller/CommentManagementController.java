package com.hjs.foodshare.comment.controller;

import com.hjs.foodshare.comment.dto.CommentResponse;
import com.hjs.foodshare.comment.dto.CommentUpdateRequest;
import com.hjs.foodshare.comment.service.CommentService;
import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.security.AuthUser;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/comments")
public class CommentManagementController {

    private final CommentService commentService;

    public CommentManagementController(CommentService commentService) {
        this.commentService = commentService;
    }

    @PutMapping("/{commentId}")
    public ResponseEntity<ApiResponse<CommentResponse>> updateComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody CommentUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Comment updated.", commentService.updateComment(commentId, authUser.userId(), request)));
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal AuthUser authUser
    ) {
        commentService.deleteComment(commentId, authUser.userId());
        return ResponseEntity.ok(ApiResponse.ok("댓글이 삭제되었습니다.", null));
    }
}
