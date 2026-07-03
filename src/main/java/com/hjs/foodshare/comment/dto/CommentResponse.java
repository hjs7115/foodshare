package com.hjs.foodshare.comment.dto;

import com.hjs.foodshare.comment.domain.Comment;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;

public record CommentResponse(
        Long commentId,
        Long postId,
        Long writerId,
        String writerNickname,
        String authorNickname,
        double rating,
        double freshness,
        String content,
        LocalDateTime createdAt,
        boolean isMine,
        boolean editable
) {

    public static CommentResponse from(Comment comment) {
        return from(comment, null);
    }

    public static CommentResponse from(Comment comment, Long currentUserId) {
        boolean mine = currentUserId != null && comment.getWriter().getId().equals(currentUserId);
        return new CommentResponse(
                comment.getId(),
                comment.getPost().getId(),
                comment.getWriter().getId(),
                comment.getWriter().getNickname(),
                comment.getWriter().getNickname(),
                4.5,
                50.0,
                comment.getContent(),
                comment.getCreatedAt(),
                mine,
                mine
        );
    }

    @JsonProperty("id")
    public Long id() {
        return commentId;
    }

    @JsonProperty("author")
    public String author() {
        return authorNickname;
    }
}
