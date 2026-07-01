package com.hjs.foodshare.comment.service;

import com.hjs.foodshare.comment.domain.Comment;
import com.hjs.foodshare.comment.dto.CommentCreateRequest;
import com.hjs.foodshare.comment.dto.CommentResponse;
import com.hjs.foodshare.comment.dto.CommentUpdateRequest;
import com.hjs.foodshare.comment.repository.CommentRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.global.response.PageResponse;
import com.hjs.foodshare.moderation.repository.UserBlockRepository;
import com.hjs.foodshare.notification.service.NotificationService;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final UserBlockRepository userBlockRepository;

    public CommentService(CommentRepository commentRepository, PostRepository postRepository, UserRepository userRepository,
                          NotificationService notificationService, UserBlockRepository userBlockRepository) {
        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.userBlockRepository = userBlockRepository;
    }

    @Transactional
    public CommentResponse createComment(Long postId, Long userId, CommentCreateRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Post not found."));
        User writer = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));
        validateNotBlocked(userId, post.getWriter().getId());

        Comment comment = Comment.create(post, writer, request.content());
        Comment savedComment = commentRepository.save(comment);
        if (!post.getWriter().getId().equals(userId) && post.getWriter().isNotificationComment()) {
            notificationService.createNotification(
                    post.getWriter().getId(),
                    "COMMENT",
                    "새 댓글",
                    writer.getNickname() + "님이 '" + post.getTitle() + "' 게시글에 댓글을 남겼습니다."
            );
        }
        return CommentResponse.from(savedComment);
    }

    public List<CommentResponse> getComments(Long postId, Long currentUserId) {
        if (!postRepository.existsById(postId)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Post not found.");
        }

        return commentRepository.findAllByPostIdOrderByCreatedAtAsc(postId)
                .stream()
                .filter(comment -> canViewWriter(currentUserId, comment.getWriter().getId()))
                .map(comment -> CommentResponse.from(comment, currentUserId))
                .toList();
    }

    public PageResponse<CommentResponse> getCommentsPage(Long postId, Long currentUserId, int page, int size) {
        return PageResponse.of(getComments(postId, currentUserId), page, size);
    }

    @Transactional
    public CommentResponse updateComment(Long commentId, Long userId, CommentUpdateRequest request) {
        Comment comment = getComment(commentId);
        validateWriter(comment, userId);
        comment.updateContent(request.content());
        return CommentResponse.from(comment);
    }

    @Transactional
    public void deleteComment(Long commentId, Long userId) {
        Comment comment = getComment(commentId);
        validateWriter(comment, userId);
        commentRepository.delete(comment);
    }

    private Comment getComment(Long commentId) {
        return commentRepository.findById(commentId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Comment not found."));
    }

    private void validateWriter(Comment comment, Long userId) {
        if (!comment.getWriter().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only the writer can change this comment.");
        }
    }

    private void validateNotBlocked(Long userId, Long writerId) {
        if (!canViewWriter(userId, writerId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Blocked users cannot comment on this post.");
        }
    }

    private boolean canViewWriter(Long currentUserId, Long writerId) {
        if (currentUserId == null || currentUserId.equals(writerId)) {
            return true;
        }
        return !userBlockRepository.existsByBlockerIdAndBlockedUserId(currentUserId, writerId)
                && !userBlockRepository.existsByBlockerIdAndBlockedUserId(writerId, currentUserId);
    }
}
