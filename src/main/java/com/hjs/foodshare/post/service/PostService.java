package com.hjs.foodshare.post.service;

import com.hjs.foodshare.comment.repository.CommentRepository;
import com.hjs.foodshare.favorite.repository.FavoriteRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.post.dto.PostCreateRequest;
import com.hjs.foodshare.post.dto.PostResponse;
import com.hjs.foodshare.post.dto.PostSort;
import com.hjs.foodshare.post.dto.PostUpdateRequest;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.review.repository.ReviewRepository;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final FavoriteRepository favoriteRepository;
    private final ReviewRepository reviewRepository;

    public PostService(PostRepository postRepository, UserRepository userRepository,
                       CommentRepository commentRepository, FavoriteRepository favoriteRepository,
                       ReviewRepository reviewRepository) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.commentRepository = commentRepository;
        this.favoriteRepository = favoriteRepository;
        this.reviewRepository = reviewRepository;
    }

    @Transactional
    public PostResponse createPost(Long userId, PostCreateRequest request) {
        User writer = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));

        Post post = Post.create(
                writer,
                request.postType(),
                request.title(),
                request.ingredientName(),
                request.quantity(),
                request.priceValue(),
                request.tradeLocation(),
                request.distanceKm() == null ? 0.0 : request.distanceKm(),
                request.expirationDateValue(),
                request.imageUrlValue(),
                request.content(),
                normalizeCurrentParticipantCount(request.currentParticipantCount()),
                request.targetParticipantCount(),
                request.deadlineDateValue()
        );

        return toResponse(postRepository.save(post), userId);
    }

    public List<PostResponse> getPosts() {
        return getPosts(null);
    }

    public List<PostResponse> getPosts(Long currentUserId) {
        return postRepository.findAllByDeletedFalseOrderByCreatedAtDesc()
                .stream()
                .map(post -> toResponse(post, currentUserId))
                .toList();
    }

    public List<PostResponse> searchPosts(PostType postType, String keyword, Double maxDistanceKm, PostSort sort, Long currentUserId) {
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();
        PostSort normalizedSort = sort == null ? PostSort.LATEST : sort;

        return postRepository.searchPosts(postType, normalizedKeyword, maxDistanceKm)
                .stream()
                .sorted(getPostComparator(normalizedSort))
                .map(post -> toResponse(post, currentUserId))
                .toList();
    }

    public PostResponse getPost(Long postId, Long currentUserId) {
        Post post = getActivePost(postId);
        return toResponse(post, currentUserId);
    }

    @Transactional
    public PostResponse updatePost(Long postId, Long userId, PostUpdateRequest request) {
        Post post = getActivePost(postId);
        validateWriter(post, userId);

        post.update(
                request.postType(),
                request.title(),
                request.ingredientName(),
                request.quantity(),
                request.priceValue(),
                request.tradeLocation(),
                request.distanceKm() == null ? 0.0 : request.distanceKm(),
                request.expirationDateValue(),
                request.imageUrlValue(),
                request.content(),
                normalizeCurrentParticipantCount(request.currentParticipantCount()),
                request.targetParticipantCount(),
                request.deadlineDateValue()
        );

        return toResponse(post, userId);
    }

    @Transactional
    public void deletePost(Long postId, Long userId) {
        Post post = getActivePost(postId);
        validateWriter(post, userId);
        post.delete();
    }

    private Post getActivePost(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Post not found."));
        if (post.isDeleted()) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Post not found.");
        }
        return post;
    }

    private void validateWriter(Post post, Long userId) {
        if (!post.getWriter().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only the writer can change this post.");
        }
    }

    private Comparator<Post> getPostComparator(PostSort sort) {
        return switch (sort) {
            case EXPIRING_SOON -> Comparator.comparing(Post::getExpirationDate)
                    .thenComparing(Post::getCreatedAt, Comparator.reverseOrder());
            case DISTANCE -> Comparator.comparing(Post::getDistanceKm)
                    .thenComparing(Post::getCreatedAt, Comparator.reverseOrder());
            case LATEST -> Comparator.comparing(Post::getCreatedAt).reversed();
        };
    }

    private Integer normalizeCurrentParticipantCount(Integer currentParticipantCount) {
        return currentParticipantCount == null ? null : Math.max(currentParticipantCount, 1);
    }

    private PostResponse toResponse(Post post, Long currentUserId) {
        Long postId = post.getId();
        return PostResponse.from(
                post,
                currentUserId,
                commentRepository.countByPostId(postId),
                favoriteRepository.countByPostId(postId),
                reviewRepository.averageRatingByTargetUserId(post.getWriter().getId()),
                currentUserId != null && favoriteRepository.existsByPostIdAndUserId(postId, currentUserId)
        );
    }
}
