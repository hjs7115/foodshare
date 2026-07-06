package com.hjs.foodshare.trade.service;

import com.hjs.foodshare.chat.domain.ChatRoom;
import com.hjs.foodshare.chat.service.ChatService;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.moderation.repository.UserBlockRepository;
import com.hjs.foodshare.notification.service.NotificationService;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.trade.domain.TradeRequest;
import com.hjs.foodshare.trade.domain.TradeRequestStatus;
import com.hjs.foodshare.trade.dto.TradeRequestResponse;
import com.hjs.foodshare.trade.repository.TradeRequestRepository;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class TradeRequestService {

    private final TradeRequestRepository tradeRequestRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ChatService chatService;
    private final UserBlockRepository userBlockRepository;

    public TradeRequestService(TradeRequestRepository tradeRequestRepository, PostRepository postRepository,
                               UserRepository userRepository, NotificationService notificationService,
                               ChatService chatService, UserBlockRepository userBlockRepository) {
        this.tradeRequestRepository = tradeRequestRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.chatService = chatService;
        this.userBlockRepository = userBlockRepository;
    }

    @Transactional
    public TradeRequestResponse createRequest(Long postId, Long requesterId) {
        Post post = getActivePost(postId);
        validateRequestablePost(post);
        if (post.getWriter().getId().equals(requesterId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "You cannot request your own post.");
        }
        validateNotBlocked(requesterId, post.getWriter().getId());
        if (tradeRequestRepository.existsByPostIdAndRequesterId(postId, requesterId)) {
            throw new BusinessException(HttpStatus.CONFLICT, "You already requested this post.");
        }

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));

        TradeRequest savedRequest = tradeRequestRepository.save(TradeRequest.create(post, requester));
        if (post.getWriter().isNotificationTradeRequest()) {
            notificationService.createNotification(
                    post.getWriter().getId(),
                    "TRADE_REQUEST",
                    "거래 요청",
                    requester.getNickname() + "님이 '" + post.getTitle() + "' 게시글에 거래를 요청했습니다.",
                    "TRADE_REQUEST",
                    savedRequest.getId()
            );
        }
        return toResponse(savedRequest);
    }

    public List<TradeRequestResponse> getMyRequests(Long requesterId) {
        return tradeRequestRepository.findAllByRequesterIdOrderByCreatedAtDesc(requesterId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<TradeRequestResponse> getReceivedRequests(Long writerId) {
        return tradeRequestRepository.findAllByPostWriterIdOrderByCreatedAtDesc(writerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<TradeRequestResponse> getRequestsForPost(Long postId, Long writerId) {
        Post post = getActivePost(postId);
        if (!post.getWriter().getId().equals(writerId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only the post writer can view requests.");
        }
        return tradeRequestRepository.findAllByPostIdOrderByCreatedAtDesc(postId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TradeRequestResponse accept(Long requestId, Long writerId) {
        TradeRequest tradeRequest = getRequestForWriter(requestId, writerId);
        if (tradeRequest.getStatus() != TradeRequestStatus.PENDING) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Only pending requests can be accepted.");
        }
        validateRequestablePost(tradeRequest.getPost());
        tradeRequest.accept();
        applyAcceptedTradePolicy(tradeRequest);
        ChatRoom chatRoom = chatService.openRoomForTradeRequest(tradeRequest);
        if (tradeRequest.getRequester().isNotificationTradeAccepted()) {
            notificationService.createNotification(
                    tradeRequest.getRequester().getId(),
                    "TRADE_ACCEPTED",
                    "거래 요청 수락",
                    "'" + tradeRequest.getPost().getTitle() + "' 거래 요청이 수락되었습니다.",
                    "TRADE_REQUEST",
                    tradeRequest.getId()
            );
        }
        notificationService.createNotification(
                tradeRequest.getRequester().getId(),
                "CHAT_ROOM_OPENED",
                "채팅방 개설",
                "'" + tradeRequest.getPost().getTitle() + "' 거래 채팅방이 개설되었습니다.",
                "CHAT_ROOM",
                chatRoom.getId()
        );
        return toResponse(tradeRequest, chatRoom.getId());
    }

    @Transactional
    public TradeRequestResponse reject(Long requestId, Long writerId) {
        TradeRequest tradeRequest = getRequestForWriter(requestId, writerId);
        if (tradeRequest.getStatus() != TradeRequestStatus.PENDING) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Only pending requests can be rejected.");
        }
        tradeRequest.reject();
        return toResponse(tradeRequest);
    }

    @Transactional
    public TradeRequestResponse complete(Long requestId, Long userId) {
        TradeRequest tradeRequest = tradeRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Trade request not found."));
        boolean isWriter = tradeRequest.getPost().getWriter().getId().equals(userId);
        boolean isRequester = tradeRequest.getRequester().getId().equals(userId);
        if (!isWriter && !isRequester) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only trade participants can complete this request.");
        }
        if (tradeRequest.getStatus() != TradeRequestStatus.ACCEPTED) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Only accepted requests can be completed.");
        }

        tradeRequest.complete();
        notifyTradeCompleted(tradeRequest);
        return toResponse(tradeRequest);
    }

    private void applyAcceptedTradePolicy(TradeRequest acceptedRequest) {
        Post post = acceptedRequest.getPost();
        if (post.getPostType() == PostType.GROUP_BUY) {
            post.increaseParticipantCount();
            return;
        }

        post.close();
        tradeRequestRepository.findAllByPostIdAndStatus(post.getId(), TradeRequestStatus.PENDING)
                .stream()
                .filter(request -> !request.getId().equals(acceptedRequest.getId()))
                .forEach(TradeRequest::reject);
    }

    private void notifyTradeCompleted(TradeRequest tradeRequest) {
        Long writerId = tradeRequest.getPost().getWriter().getId();
        Long requesterId = tradeRequest.getRequester().getId();
        String message = "'" + tradeRequest.getPost().getTitle() + "' 거래가 완료되었습니다.";

        notificationService.createNotification(
                writerId,
                "TRADE_COMPLETED",
                "거래 완료",
                message,
                "TRADE_REQUEST",
                tradeRequest.getId()
        );
        notificationService.createNotification(
                requesterId,
                "TRADE_COMPLETED",
                "거래 완료",
                message,
                "TRADE_REQUEST",
                tradeRequest.getId()
        );
    }

    private TradeRequestResponse toResponse(TradeRequest tradeRequest) {
        return toResponse(tradeRequest, chatService.findRoomIdByTradeRequestId(tradeRequest.getId()));
    }

    private TradeRequestResponse toResponse(TradeRequest tradeRequest, Long chatRoomId) {
        Long requesterId = tradeRequest.getRequester().getId();
        return TradeRequestResponse.from(
                tradeRequest,
                countShareCompleted(requesterId),
                countReceivedShare(requesterId),
                countGroupBuyParticipation(requesterId),
                chatRoomId
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

    private void validateRequestablePost(Post post) {
        if (!post.isOpen()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Post is closed.");
        }
        if (post.getPostType() == PostType.GROUP_BUY) {
            validateGroupBuyRequestable(post);
        }
    }

    private void validateNotBlocked(Long requesterId, Long writerId) {
        if (userBlockRepository.existsByBlockerIdAndBlockedUserId(requesterId, writerId)
                || userBlockRepository.existsByBlockerIdAndBlockedUserId(writerId, requesterId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Blocked users cannot request this post.");
        }
    }

    private void validateGroupBuyRequestable(Post post) {
        if (post.getDeadlineDate() != null && post.getDeadlineDate().isBefore(LocalDate.now())) {
            post.close();
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Group buy deadline has passed.");
        }
        if (post.getTargetParticipantCount() == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Group buy target participant count is required.");
        }
        if (post.getCurrentParticipantCount() == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Group buy current participant count is required.");
        }
        if (post.getCurrentParticipantCount() >= post.getTargetParticipantCount()) {
            post.close();
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Group buy is full.");
        }
    }

    private TradeRequest getRequestForWriter(Long requestId, Long writerId) {
        TradeRequest tradeRequest = tradeRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Trade request not found."));
        if (!tradeRequest.getPost().getWriter().getId().equals(writerId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only the post writer can respond to this request.");
        }
        return tradeRequest;
    }

    private Post getActivePost(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Post not found."));
        if (post.isDeleted()) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Post not found.");
        }
        return post;
    }
}
