package com.hjs.foodshare.review.service;

import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.global.response.PageResponse;
import com.hjs.foodshare.notification.service.NotificationService;
import com.hjs.foodshare.review.domain.Review;
import com.hjs.foodshare.review.dto.RatingSummaryResponse;
import com.hjs.foodshare.review.dto.ReviewCreateRequest;
import com.hjs.foodshare.review.dto.ReviewResponse;
import com.hjs.foodshare.review.repository.ReviewRepository;
import com.hjs.foodshare.trade.domain.TradeRequest;
import com.hjs.foodshare.trade.domain.TradeRequestStatus;
import com.hjs.foodshare.trade.repository.TradeRequestRepository;
import com.hjs.foodshare.user.domain.FreshnessGrade;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ReviewService {
    @org.springframework.beans.factory.annotation.Autowired private com.hjs.foodshare.demo.DemoVisibility demo;

    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager em;
    private final ReviewRepository reviewRepository;
    private final TradeRequestRepository tradeRequestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public ReviewService(
            ReviewRepository reviewRepository,
            TradeRequestRepository tradeRequestRepository,
            UserRepository userRepository,
            NotificationService notificationService
    ) {
        this.reviewRepository = reviewRepository;
        this.tradeRequestRepository = tradeRequestRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public ReviewResponse createReview(Long tradeRequestId, Long reviewerId, ReviewCreateRequest request) {
        TradeRequest tradeRequest = tradeRequestRepository.findById(tradeRequestId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Trade request not found."));
        if (tradeRequest.getStatus() != TradeRequestStatus.COMPLETED) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Only completed trades can be reviewed.");
        }
        // Serialize reviews of one trade, then score changes on the target user.
        em.refresh(tradeRequest,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if(tradeRequest.getStatus()!=TradeRequestStatus.COMPLETED)throw new BusinessException(HttpStatus.CONFLICT,"완료 거래만 평가할 수 있습니다.");
        if (reviewRepository.existsByTradeRequestIdAndReviewerId(tradeRequestId, reviewerId)) {
            throw new BusinessException(HttpStatus.CONFLICT, "You already reviewed this trade.");
        }

        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));
        User writer = tradeRequest.getPost().getWriter();
        User requester = tradeRequest.getRequester();

        User targetUser;
        if (writer.getId().equals(reviewerId)) {
            targetUser = requester;
        } else if (requester.getId().equals(reviewerId)) {
            targetUser = writer;
        } else {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only trade participants can review this trade.");
        }

        em.refresh(targetUser,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        demo.rememberScore(targetUser, tradeRequestId);
        Review review = Review.create(tradeRequest, reviewer, targetUser, request.rating(), request.content());
        targetUser.updateFreshnessScore(
                FreshnessCalculator.update(targetUser.getFreshnessScore(), request.rating())
        );
        Review savedReview = reviewRepository.save(review);
        notificationService.createNotification(
                targetUser.getId(),
                "REVIEW",
                "새 평가",
                reviewer.getNickname() + "님이 거래 평가를 남겼습니다.",
                "REVIEW",
                savedReview.getId()
        );
        return ReviewResponse.from(savedReview);
    }

    @Transactional
    public ReviewResponse createReviewForUser(Long targetUserId, Long reviewerId, ReviewCreateRequest request) {
        if (targetUserId.equals(reviewerId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "You cannot review yourself.");
        }

        TradeRequest tradeRequest = tradeRequestRepository
                .findCompletedTradesBetweenUsers(
                        reviewerId,
                        targetUserId,
                        TradeRequestStatus.COMPLETED,
                        PageRequest.of(0, 1)
                )
                .stream()
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND,
                        "Completed trade with this user not found."
                ));

        return createReview(tradeRequest.getId(), reviewerId, request);
    }

    public List<ReviewResponse> getReviewsForUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "User not found.");
        }
        return reviewRepository.findAllByTargetUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(ReviewResponse::from)
                .toList();
    }

    public PageResponse<ReviewResponse> getReviewsForUserPage(Long userId, int page, int size) {
        var result=reviewRepository.findAllByTargetUserIdOrderByCreatedAtDesc(userId,org.springframework.data.domain.PageRequest.of(Math.max(0,page),Math.min(100,Math.max(1,size))));
        return new PageResponse<>(result.getContent().stream().map(ReviewResponse::from).toList(),result.getNumber(),result.getSize(),result.getTotalElements(),result.getTotalPages(),result.isFirst(),result.isLast());
    }

    public List<ReviewResponse> getMyWrittenReviews(Long userId) {
        return reviewRepository.findAllByReviewerIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(ReviewResponse::from)
                .toList();
    }

    public PageResponse<ReviewResponse> getMyWrittenReviewsPage(Long userId, int page, int size) {
        var result=reviewRepository.findAllByReviewerIdOrderByCreatedAtDesc(userId,org.springframework.data.domain.PageRequest.of(Math.max(0,page),Math.min(100,Math.max(1,size))));
        return new PageResponse<>(result.getContent().stream().map(ReviewResponse::from).toList(),result.getNumber(),result.getSize(),result.getTotalElements(),result.getTotalPages(),result.isFirst(),result.isLast());
    }

    public RatingSummaryResponse getRatingSummary(Long userId) {
        long count=reviewRepository.countByTargetUserId(userId);
        double averageRating=Math.round(reviewRepository.averageRatingByTargetUserId(userId)*10.0)/10.0;
        double freshness = userRepository.findById(userId)
                .map(User::getFreshnessScore)
                .orElse(FreshnessCalculator.baseScore());
        FreshnessGrade freshnessGrade = FreshnessGrade.fromScore(freshness);
        return new RatingSummaryResponse(
                userId,
                averageRating,
                freshness,
                freshnessGrade.name(),
                freshnessGrade.getIcon(),
                freshnessGrade.getLabel(),
                count,java.util.stream.IntStream.rangeClosed(1,5).mapToObj(n->reviewRepository.countByTargetUserIdAndRating(userId,n)).toList()
        );
    }
}
