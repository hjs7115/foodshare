package com.hjs.foodshare.post.service;

import com.hjs.foodshare.comment.repository.CommentRepository;
import com.hjs.foodshare.favorite.repository.FavoriteRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.global.response.PageResponse;
import com.hjs.foodshare.moderation.repository.UserBlockRepository;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.post.dto.PostCreateRequest;
import com.hjs.foodshare.post.dto.PostResponse;
import com.hjs.foodshare.post.dto.PostSort;
import com.hjs.foodshare.post.dto.PostUpdateRequest;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.review.repository.ReviewRepository;
import com.hjs.foodshare.upload.service.ImageUploadService;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.time.LocalDate;
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
    private final UserBlockRepository userBlockRepository;
    private final ImageUploadService imageUploadService;

    public PostService(PostRepository postRepository, UserRepository userRepository,
                       CommentRepository commentRepository, FavoriteRepository favoriteRepository,
                       ReviewRepository reviewRepository, UserBlockRepository userBlockRepository,
                       ImageUploadService imageUploadService) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.commentRepository = commentRepository;
        this.favoriteRepository = favoriteRepository;
        this.reviewRepository = reviewRepository;
        this.userBlockRepository = userBlockRepository;
        this.imageUploadService = imageUploadService;
    }

    @Transactional
    public PostResponse createPost(Long userId, PostCreateRequest request) {
        User writer = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));
        validatePostRequest(
                request.postType(),
                request.currentParticipantCount(),
                request.targetParticipantCount(),
                request.deadlineDateValue()
        );

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
                request.latitude(),
                request.longitude(),
                request.imageUrlValue(),
                request.content(),
                normalizeCurrentParticipantCount(request.postType(), request.currentParticipantCount()),
                normalizeTargetParticipantCount(request.postType(), request.targetParticipantCount()),
                normalizeDeadlineDate(request.postType(), request.deadlineDateValue())
        );

        return toResponse(postRepository.save(post), userId);
    }

    public List<PostResponse> getPosts() {
        return getPosts(null);
    }

    public List<PostResponse> getPosts(Long currentUserId) {
        return postRepository.findAllByDeletedFalseOrderByCreatedAtDesc()
                .stream()
                .filter(post -> canViewWriter(currentUserId, post.getWriter().getId()))
                .map(post -> toResponse(post, currentUserId))
                .toList();
    }

    @Transactional
    public PageResponse<PostResponse> searchPostsPage(PostType postType, String keyword, Double maxDistanceKm,
                                                       Double latitude, Double longitude, Boolean expiringSoon,
                                                       PostSort sort, Long currentUserId, int page, int size) {
        return PageResponse.of(
                searchPosts(postType, keyword, maxDistanceKm, latitude, longitude, expiringSoon, sort, currentUserId),
                page,
                size
        );
    }

    @Transactional
    public List<PostResponse> searchPosts(PostType postType, String keyword, Double maxDistanceKm, Double latitude,
                                          Double longitude, Boolean expiringSoon, PostSort sort, Long currentUserId) {
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();
        PostSort normalizedSort = sort == null ? PostSort.LATEST : sort;

        return postRepository.searchPosts(postType, normalizedKeyword)
                .stream()
                .filter(this::keepVisibleOrCloseExpired)
                .filter(post -> canViewWriter(currentUserId, post.getWriter().getId()))
                .filter(post -> !Boolean.TRUE.equals(expiringSoon) || isExpiringSoon(post))
                .map(post -> toResponse(post, currentUserId).withDistance(resolveDistanceKm(post, latitude, longitude)))
                .filter(response -> isInsideDistance(response, maxDistanceKm, latitude, longitude))
                .sorted(getPostResponseComparator(normalizedSort))
                .toList();
    }

    public PostResponse getPost(Long postId, Long currentUserId) {
        Post post = getActivePost(postId);
        if (!canViewWriter(currentUserId, post.getWriter().getId())) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Blocked users cannot view this post.");
        }
        return toResponse(post, currentUserId);
    }

    @Transactional
    public PostResponse updatePost(Long postId, Long userId, PostUpdateRequest request) {
        Post post = getActivePost(postId);
        validateWriter(post, userId);
        String previousImageUrl = post.getImageUrl();
        validatePostRequest(
                request.postType(),
                request.currentParticipantCount(),
                request.targetParticipantCount(),
                request.deadlineDateValue()
        );

        post.update(
                request.postType(),
                request.title(),
                request.ingredientName(),
                request.quantity(),
                request.priceValue(),
                request.tradeLocation(),
                request.distanceKm() == null ? 0.0 : request.distanceKm(),
                request.expirationDateValue(),
                request.latitude(),
                request.longitude(),
                request.imageUrlValue(),
                request.content(),
                normalizeCurrentParticipantCount(request.postType(), request.currentParticipantCount()),
                normalizeTargetParticipantCount(request.postType(), request.targetParticipantCount()),
                normalizeDeadlineDate(request.postType(), request.deadlineDateValue())
        );

        deleteReplacedImage(previousImageUrl, post.getImageUrl());

        return toResponse(post, userId);
    }

    @Transactional
    public void deletePost(Long postId, Long userId) {
        Post post = getActivePost(postId);
        validateWriter(post, userId);
        post.delete();
        imageUploadService.deleteIfLocalUpload(post.getImageUrl());
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

    private Comparator<PostResponse> getPostResponseComparator(PostSort sort) {
        return switch (sort) {
            case EXPIRING_SOON -> Comparator.comparing(PostResponse::expirationDate)
                    .thenComparing(PostResponse::createdAt, Comparator.reverseOrder());
            case DISTANCE -> Comparator.comparing(
                            PostResponse::distanceKm,
                            Comparator.nullsLast(Double::compareTo)
                    )
                    .thenComparing(PostResponse::createdAt, Comparator.reverseOrder());
            case FRESHNESS -> Comparator.comparing(PostResponse::freshness)
                    .reversed()
                    .thenComparing(PostResponse::createdAt, Comparator.reverseOrder());
            case PRICE_LOW -> Comparator.comparing(
                            PostResponse::price,
                            Comparator.nullsLast(Integer::compareTo)
                    )
                    .thenComparing(PostResponse::createdAt, Comparator.reverseOrder());
            case LATEST -> Comparator.comparing(PostResponse::createdAt).reversed();
        };
    }

    private boolean isExpiringSoon(Post post) {
        LocalDate today = LocalDate.now();
        return !post.getExpirationDate().isBefore(today)
                && !post.getExpirationDate().isAfter(today.plusDays(3));
    }

    private boolean keepVisibleOrCloseExpired(Post post) {
        if (post.getExpirationDate().isBefore(LocalDate.now())) {
            post.close();
            return false;
        }
        return true;
    }

    private Double resolveDistanceKm(Post post, Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            return post.getDistanceKm();
        }
        if (post.getLatitude() == null || post.getLongitude() == null) {
            return null;
        }
        return calculateDistanceKm(latitude, longitude, post.getLatitude(), post.getLongitude());
    }

    private boolean isInsideDistance(PostResponse response, Double maxDistanceKm, Double latitude, Double longitude) {
        if (maxDistanceKm == null) {
            return true;
        }
        if (latitude == null || longitude == null || response.distanceKm() == null) {
            return false;
        }
        return response.distanceKm() <= maxDistanceKm;
    }

    private double calculateDistanceKm(double fromLat, double fromLng, double toLat, double toLng) {
        double earthRadiusKm = 6371.0;
        double latDistance = Math.toRadians(toLat - fromLat);
        double lngDistance = Math.toRadians(toLng - fromLng);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(fromLat)) * Math.cos(Math.toRadians(toLat))
                * Math.sin(lngDistance / 2) * Math.sin(lngDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }

    private void validatePostRequest(
            PostType postType,
            Integer currentParticipantCount,
            Integer targetParticipantCount,
            LocalDate deadlineDate
    ) {
        if (postType != PostType.GROUP_BUY) {
            return;
        }
        int currentCount = currentParticipantCount == null ? 1 : currentParticipantCount;
        if (targetParticipantCount == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "targetParticipantCount is required for group buy posts.");
        }
        if (targetParticipantCount < currentCount) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "targetParticipantCount must be greater than or equal to currentParticipantCount.");
        }
        if (deadlineDate == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "deadlineDate is required for group buy posts.");
        }
        if (deadlineDate.isBefore(LocalDate.now())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "deadlineDate must be today or later.");
        }
    }

    private boolean canViewWriter(Long currentUserId, Long writerId) {
        if (currentUserId == null || currentUserId.equals(writerId)) {
            return true;
        }
        return !userBlockRepository.existsByBlockerIdAndBlockedUserId(currentUserId, writerId)
                && !userBlockRepository.existsByBlockerIdAndBlockedUserId(writerId, currentUserId);
    }

    private void deleteReplacedImage(String previousImageUrl, String nextImageUrl) {
        if (previousImageUrl != null && !previousImageUrl.equals(nextImageUrl)) {
            imageUploadService.deleteIfLocalUpload(previousImageUrl);
        }
    }

    private Integer normalizeCurrentParticipantCount(PostType postType, Integer currentParticipantCount) {
        if (postType != PostType.GROUP_BUY) {
            return null;
        }
        return currentParticipantCount == null ? 1 : Math.max(currentParticipantCount, 1);
    }

    private Integer normalizeTargetParticipantCount(PostType postType, Integer targetParticipantCount) {
        return postType == PostType.GROUP_BUY ? targetParticipantCount : null;
    }

    private LocalDate normalizeDeadlineDate(PostType postType, LocalDate deadlineDate) {
        return postType == PostType.GROUP_BUY ? deadlineDate : null;
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
