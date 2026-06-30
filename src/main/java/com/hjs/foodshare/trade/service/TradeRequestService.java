package com.hjs.foodshare.trade.service;

import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.post.repository.PostRepository;
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
public class TradeRequestService {

    private final TradeRequestRepository tradeRequestRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    public TradeRequestService(TradeRequestRepository tradeRequestRepository, PostRepository postRepository, UserRepository userRepository) {
        this.tradeRequestRepository = tradeRequestRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public TradeRequestResponse createRequest(Long postId, Long requesterId) {
        Post post = getActivePost(postId);
        if (post.getWriter().getId().equals(requesterId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "You cannot request your own post.");
        }
        if (tradeRequestRepository.existsByPostIdAndRequesterId(postId, requesterId)) {
            throw new BusinessException(HttpStatus.CONFLICT, "You already requested this post.");
        }

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));

        return TradeRequestResponse.from(tradeRequestRepository.save(TradeRequest.create(post, requester)));
    }

    public List<TradeRequestResponse> getMyRequests(Long requesterId) {
        return tradeRequestRepository.findAllByRequesterIdOrderByCreatedAtDesc(requesterId)
                .stream()
                .map(TradeRequestResponse::from)
                .toList();
    }

    public List<TradeRequestResponse> getReceivedRequests(Long writerId) {
        return tradeRequestRepository.findAllByPostWriterIdOrderByCreatedAtDesc(writerId)
                .stream()
                .map(TradeRequestResponse::from)
                .toList();
    }

    public List<TradeRequestResponse> getRequestsForPost(Long postId, Long writerId) {
        Post post = getActivePost(postId);
        if (!post.getWriter().getId().equals(writerId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only the post writer can view requests.");
        }
        return tradeRequestRepository.findAllByPostIdOrderByCreatedAtDesc(postId)
                .stream()
                .map(TradeRequestResponse::from)
                .toList();
    }

    @Transactional
    public TradeRequestResponse accept(Long requestId, Long writerId) {
        TradeRequest tradeRequest = getRequestForWriter(requestId, writerId);
        if (tradeRequest.getStatus() != TradeRequestStatus.PENDING) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Only pending requests can be accepted.");
        }
        tradeRequest.accept();
        return TradeRequestResponse.from(tradeRequest);
    }

    @Transactional
    public TradeRequestResponse reject(Long requestId, Long writerId) {
        TradeRequest tradeRequest = getRequestForWriter(requestId, writerId);
        if (tradeRequest.getStatus() != TradeRequestStatus.PENDING) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Only pending requests can be rejected.");
        }
        tradeRequest.reject();
        return TradeRequestResponse.from(tradeRequest);
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
        return TradeRequestResponse.from(tradeRequest);
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
