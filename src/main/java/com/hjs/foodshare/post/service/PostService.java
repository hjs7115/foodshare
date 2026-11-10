package com.hjs.foodshare.post.service;

import com.hjs.foodshare.ai.domain.IngredientAnalysis;
import com.hjs.foodshare.ai.service.IngredientAnalysisService;
import com.hjs.foodshare.comment.repository.CommentRepository;
import com.hjs.foodshare.favorite.repository.FavoriteRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.global.response.PageResponse;
import com.hjs.foodshare.moderation.repository.UserBlockRepository;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.post.domain.PostStatus;
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
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PostService {

    @org.springframework.beans.factory.annotation.Autowired
    private com.hjs.foodshare.demo.DemoVisibility demo;

    @org.springframework.beans.factory.annotation.Autowired
    private com.hjs.foodshare.post.repository.PostPageQuery pages;
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager em;
    @org.springframework.beans.factory.annotation.Autowired private com.hjs.foodshare.trade.repository.TradeRequestRepository trades;
    @org.springframework.beans.factory.annotation.Autowired private com.hjs.foodshare.notification.service.NotificationService notifications;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final FavoriteRepository favoriteRepository;
    private final ReviewRepository reviewRepository;
    private final UserBlockRepository userBlockRepository;
    private final ImageUploadService imageUploadService;
    private final IngredientAnalysisService ingredientAnalysisService;

    public PostService(PostRepository postRepository, UserRepository userRepository,
                       CommentRepository commentRepository, FavoriteRepository favoriteRepository,
                       ReviewRepository reviewRepository, UserBlockRepository userBlockRepository,
                       ImageUploadService imageUploadService,
                       IngredientAnalysisService ingredientAnalysisService) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.commentRepository = commentRepository;
        this.favoriteRepository = favoriteRepository;
        this.reviewRepository = reviewRepository;
        this.userBlockRepository = userBlockRepository;
        this.imageUploadService = imageUploadService;
        this.ingredientAnalysisService = ingredientAnalysisService;
    }

    @Transactional
    public PostResponse createPost(Long userId, PostCreateRequest request) {
        com.hjs.foodshare.post.dto.PostValues.coordinates(request.latitude(),request.longitude());
        imageUploadService.requireOwned(request.imageUrlValue(), userId, null);
        User writer = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));
        var deadline = normalizeDeadlineDate(request.deadlineDateValue());
        validatePostRequest(request.postType(), request.targetParticipantCount(), deadline);
        IngredientAnalysis ingredientAnalysis = request.postType() == PostType.GROUP_BUY
                ? null
                : ingredientAnalysisService.claimForPost(request.analysisId(), userId,request.imageUrlValue());

        Post post = Post.create(
                writer,
                request.postType(),
                request.title(),
                request.ingredientName(),
                request.quantity(),
                request.priceValue(),
                request.tradeLocation(),
                request.distanceKm() == null ? 0.0 : request.distanceKm(),
                usesDeadlineAsExpiration(request.postType(), deadline) ? deadline.toLocalDate() : request.expirationDateValue(),
                request.latitude(),
                request.longitude(),
                request.imageUrlValue(),
                request.content(),
                normalizeCurrentParticipantCount(request.postType(), request.currentParticipantCount()),
                normalizeTargetParticipantCount(request.postType(), request.targetParticipantCount()),
                deadline,
                ingredientAnalysis
        );

        post.setPriceNegotiable(request.priceNegotiable());
        Post saved = postRepository.save(post);
        notifications.notifyNearbyPost(saved);
        return toResponse(saved, userId);
    }

    public List<PostResponse> getPosts() {
        return getPosts(null);
    }

    public List<PostResponse> getPosts(Long currentUserId) {
        var hidden = demo.hiddenPostIds();
        return postRepository.findAllByDeletedFalseAndStatusOrderByCreatedAtDesc(PostStatus.OPEN)
                .stream()
                .filter(Post::isOpen)
                .filter(post -> !post.hasPassedDeadline())
                .filter(post -> !post.getEffectiveExpirationDate().isBefore(LocalDate.now(java.time.ZoneId.of("Asia/Seoul"))))
                .filter(post -> !post.isOpenFridgePost() && !hidden.contains(post.getId()))
                .filter(post -> canViewWriter(currentUserId, post.getWriter().getId()))
                .map(post -> toResponse(post, currentUserId))
                .toList();
    }

    @Transactional
    public PageResponse<PostResponse> searchPostsPage(PostType postType, String keyword, Double maxDistanceKm,
                                                       Double latitude, Double longitude, Boolean expiringSoon,
                                                       PostSort sort, Long currentUserId, int page, int size) {
        return searchPostsPage(postType, keyword, maxDistanceKm, latitude, longitude, expiringSoon, sort, currentUserId, page, size, false);
    }

    public PageResponse<PostResponse> searchPostsPage(PostType postType, String keyword, Double maxDistanceKm,
            Double latitude, Double longitude, Boolean expiringSoon, PostSort sort, Long currentUserId,
            int page, int size, boolean marketOnly) {
        int safePage = Math.max(page, 0), safeSize = Math.min(Math.max(size, 1), 100);
        long offset = (long)safePage * safeSize;
        var result = pages.search(postType, keyword, maxDistanceKm, latitude, longitude,
                Boolean.TRUE.equals(expiringSoon), sort, currentUserId, marketOnly, (int)Math.min(offset, Integer.MAX_VALUE), safeSize);
        var content = result.posts().stream().map(post -> toResponse(post,currentUserId)
                .withDistance(resolveDistanceKm(post,latitude,longitude))).toList();
        int totalPages=(int)Math.ceil((double)result.total()/safeSize);
        return new PageResponse<>(content,safePage,safeSize,result.total(),totalPages,safePage==0,totalPages==0 || safePage>=totalPages-1);
    }

    public List<PostResponse> searchPosts(PostType postType, String keyword, Double maxDistanceKm, Double latitude,
                                          Double longitude, Boolean expiringSoon, PostSort sort, Long currentUserId) {
        return pages.search(postType,keyword,maxDistanceKm,latitude,longitude,Boolean.TRUE.equals(expiringSoon),
                sort,currentUserId,false,0,Integer.MAX_VALUE).posts().stream()
                .map(post -> toResponse(post,currentUserId).withDistance(resolveDistanceKm(post,latitude,longitude))).toList();
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
        em.refresh(post,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (trades.existsByPostIdAndStatusIn(postId,List.of(com.hjs.foodshare.trade.domain.TradeRequestStatus.PENDING,com.hjs.foodshare.trade.domain.TradeRequestStatus.ACCEPTED,com.hjs.foodshare.trade.domain.TradeRequestStatus.COMPLETED)))
            throw new BusinessException(HttpStatus.CONFLICT,"거래 요청이 있는 글의 조건은 바꿀 수 없습니다. 대기 요청을 정리하고 새 글을 작성해주세요.");
        if (post.isOpenFridgePost()) throw new BusinessException(HttpStatus.BAD_REQUEST, "열린 냉장고에서 재료를 수정하고 다시 공개해주세요.");
        com.hjs.foodshare.post.dto.PostValues.coordinates(request.latitude(),request.longitude());
        String previousImageUrl = post.getImageUrl();
        imageUploadService.requireOwned(request.imageUrlValue(), userId, previousImageUrl);
        var deadline = normalizeDeadlineDate(request.deadlineDateValue());
        validatePostRequest(request.postType(), request.targetParticipantCount(), deadline);

        post.clearAnalysis();
        post.update(
                request.postType(),
                request.title(),
                request.ingredientName(),
                request.quantity(),
                request.priceValue(),
                request.tradeLocation(),
                request.distanceKm() == null ? 0.0 : request.distanceKm(),
                usesDeadlineAsExpiration(request.postType(), deadline) ? deadline.toLocalDate() : request.expirationDateValue(),
                request.latitude(),
                request.longitude(),
                request.imageUrlValue(),
                request.content(),
                normalizeCurrentParticipantCount(request.postType(), request.currentParticipantCount()),
                normalizeTargetParticipantCount(request.postType(), request.targetParticipantCount()),
                deadline
        );

        post.setPriceNegotiable(request.priceNegotiable());
        deleteReplacedImage(previousImageUrl, post.getImageUrl());

        return toResponse(post, userId);
    }

    @Transactional
    public void deletePost(Long postId, Long userId) {
        Post post = getActivePost(postId);
        validateWriter(post, userId);
        em.refresh(post,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (trades.existsByPostIdAndStatusIn(postId,List.of(com.hjs.foodshare.trade.domain.TradeRequestStatus.ACCEPTED)))
            throw new BusinessException(HttpStatus.CONFLICT,"진행 중인 거래를 먼저 취소하거나 완료해주세요.");
        trades.findAllByPostIdAndStatus(postId,com.hjs.foodshare.trade.domain.TradeRequestStatus.PENDING).forEach(r -> {
            r.reject(); notifications.createNotification(r.getRequester().getId(),"TRADE_CANCELLED","거래 요청 종료","게시글이 삭제되어 요청이 종료되었습니다.","TRADE_REQUEST",r.getId());
        });
        post.delete();
        imageUploadService.deleteIfLocalUpload(post.getImageUrl());
    }

    private Post getActivePost(Long postId) {
        demo.requireVisible(postId);
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Post not found."));
        if (post.isDeleted() || !post.getWriter().isAvailable()) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Post not found.");
        }
        return post;
    }

    private void validateWriter(Post post, Long userId) {
        if (!post.getWriter().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only the writer can change this post.");
        }
    }

    private Double resolveDistanceKm(Post post, Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            return post.getDistanceKm();
        }
        if (post.getLatitude() == null || post.getLongitude() == null) {
            return null;
        }
        return Math.round(calculateDistanceKm(latitude, longitude, Math.round(post.getLatitude()*100)/100.0, Math.round(post.getLongitude()*100)/100.0)*10)/10.0;
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
            Integer targetParticipantCount,
            LocalDateTime deadlineDate
    ) {
        if (deadlineDate != null && !deadlineDate.isAfter(LocalDateTime.now(java.time.ZoneId.of("Asia/Seoul")))) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "마감 시간은 현재보다 이후로 설정해주세요.");
        }
        if (postType != PostType.GROUP_BUY) {
            return;
        }
        int currentCount = 1;
        if (targetParticipantCount == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "targetParticipantCount is required for group buy posts.");
        }
        if (targetParticipantCount < 2 || targetParticipantCount > 100 || targetParticipantCount < currentCount) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "공동구매 정원은 주최자를 포함해 2~100명으로 입력해주세요.");
        }
        if (deadlineDate == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "deadlineDate is required for group buy posts.");
        }
    }

    private boolean canViewWriter(Long currentUserId, Long writerId) {
        if (currentUserId == null || currentUserId.equals(writerId)) {
            return true;
        }
        return !userBlockRepository.blockedEitherWay(writerId, currentUserId);
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
        return 1;
    }

    private Integer normalizeTargetParticipantCount(PostType postType, Integer targetParticipantCount) {
        return postType == PostType.GROUP_BUY ? targetParticipantCount : null;
    }

    private boolean usesDeadlineAsExpiration(PostType postType, LocalDateTime deadline) {
        return deadline != null && (postType == PostType.BUY || postType == PostType.GROUP_BUY);
    }

    private LocalDateTime normalizeDeadlineDate(LocalDateTime deadlineDate) {
        if (deadlineDate == null) {
            return null;
        }
        return deadlineDate.withMinute(0).withSecond(0).withNano(0);
    }

    private PostResponse toResponse(Post post, Long currentUserId) {
        Long postId = post.getId();
        PostResponse response = PostResponse.from(
                post,
                currentUserId,
                commentRepository.countByPostId(postId),
                favoriteRepository.countByPostId(postId),
                reviewRepository.averageRatingByTargetUserId(post.getWriter().getId()),
                currentUserId != null && favoriteRepository.existsByPostIdAndUserId(postId, currentUserId)
        );
        return demo.enabled() && (demo.isTemplate(postId) || demo.isPrivatePost(postId))
                ? response.withDemoPresentation()
                : response;
    }
}
