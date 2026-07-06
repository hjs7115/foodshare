package com.hjs.foodshare.mypage.service;

import com.hjs.foodshare.chat.service.ChatService;
import com.hjs.foodshare.favorite.repository.FavoriteRepository;
import com.hjs.foodshare.auth.dto.UserResponse;
import com.hjs.foodshare.comment.dto.CommentResponse;
import com.hjs.foodshare.comment.repository.CommentRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.mypage.dto.LocationResponse;
import com.hjs.foodshare.mypage.dto.LocationUpdateRequest;
import com.hjs.foodshare.mypage.dto.MyPageResponse;
import com.hjs.foodshare.mypage.dto.ProfileUpdateRequest;
import com.hjs.foodshare.post.dto.PostResponse;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.review.dto.RatingSummaryResponse;
import com.hjs.foodshare.review.repository.ReviewRepository;
import com.hjs.foodshare.review.service.ReviewService;
import com.hjs.foodshare.trade.domain.TradeRequest;
import com.hjs.foodshare.trade.domain.TradeRequestStatus;
import com.hjs.foodshare.trade.dto.TradeRequestResponse;
import com.hjs.foodshare.trade.repository.TradeRequestRepository;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class MyPageService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final FavoriteRepository favoriteRepository;
    private final ReviewRepository reviewRepository;
    private final TradeRequestRepository tradeRequestRepository;
    private final ReviewService reviewService;
    private final ChatService chatService;

    public MyPageService(UserRepository userRepository, PostRepository postRepository,
                         CommentRepository commentRepository, FavoriteRepository favoriteRepository,
                         ReviewRepository reviewRepository, TradeRequestRepository tradeRequestRepository,
                         ReviewService reviewService, ChatService chatService) {
        this.userRepository = userRepository;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.favoriteRepository = favoriteRepository;
        this.reviewRepository = reviewRepository;
        this.tradeRequestRepository = tradeRequestRepository;
        this.reviewService = reviewService;
        this.chatService = chatService;
    }

    public MyPageResponse getMyPage(Long userId) {
        User user = getUser(userId);
        List<PostResponse> posts = getMyPosts(userId);
        List<CommentResponse> comments = getMyComments(userId);
        List<TradeRequestResponse> myRequests = getMyTradeRequests(userId);
        List<TradeRequestResponse> receivedRequests = getReceivedTradeRequests(userId);
        RatingSummaryResponse ratingSummary = reviewService.getRatingSummary(userId);

        return new MyPageResponse(
                UserResponse.from(user),
                posts.size(),
                comments.size(),
                myRequests.size(),
                receivedRequests.size(),
                ratingSummary.averageRating(),
                ratingSummary.reviewCount()
        );
    }

    public List<PostResponse> getMyPosts(Long userId) {
        return postRepository.findAllByWriterIdAndDeletedFalseOrderByCreatedAtDesc(userId)
                .stream()
                .map(post -> PostResponse.from(
                        post,
                        userId,
                        commentRepository.countByPostId(post.getId()),
                        favoriteRepository.countByPostId(post.getId()),
                        reviewRepository.averageRatingByTargetUserId(post.getWriter().getId()),
                        favoriteRepository.existsByPostIdAndUserId(post.getId(), userId)
                ))
                .toList();
    }

    public List<CommentResponse> getMyComments(Long userId) {
        return commentRepository.findAllByWriterIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(CommentResponse::from)
                .toList();
    }

    public List<TradeRequestResponse> getMyTradeRequests(Long userId) {
        return tradeRequestRepository.findAllByRequesterIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toTradeRequestResponse)
                .toList();
    }

    public List<TradeRequestResponse> getReceivedTradeRequests(Long userId) {
        return tradeRequestRepository.findAllByPostWriterIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toTradeRequestResponse)
                .toList();
    }

    @Transactional
    public UserResponse updateProfile(Long userId, ProfileUpdateRequest request) {
        User user = getUser(userId);
        user.updateProfile(request.nickname(), request.location(), request.profileImage());
        return UserResponse.from(user);
    }

    @Transactional
    public LocationResponse updateLocation(Long userId, LocationUpdateRequest request) {
        User user = getUser(userId);
        user.updateLocation(request.location(), request.latitudeValue(), request.longitudeValue());
        return LocationResponse.from(user);
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));
    }

    private TradeRequestResponse toTradeRequestResponse(TradeRequest tradeRequest) {
        Long requesterId = tradeRequest.getRequester().getId();
        return TradeRequestResponse.from(
                tradeRequest,
                countShareCompleted(requesterId),
                countReceivedShare(requesterId),
                countGroupBuyParticipation(requesterId),
                chatService.findRoomIdByTradeRequestId(tradeRequest.getId())
        );
    }

    private long countShareCompleted(Long userId) {
        return tradeRequestRepository.countByPostWriterIdAndPostTypeAndStatus(
                userId,
                PostType.SHARE,
                TradeRequestStatus.COMPLETED
        );
    }

    private long countReceivedShare(Long userId) {
        return tradeRequestRepository.countByRequesterIdAndPostTypeAndStatus(
                userId,
                PostType.SHARE,
                TradeRequestStatus.COMPLETED
        );
    }

    private long countGroupBuyParticipation(Long userId) {
        return tradeRequestRepository.countByRequesterIdAndPostTypeAndStatus(
                userId,
                PostType.GROUP_BUY,
                TradeRequestStatus.COMPLETED
        );
    }
}
