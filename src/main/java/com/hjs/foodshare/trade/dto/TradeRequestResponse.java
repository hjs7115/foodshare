package com.hjs.foodshare.trade.dto;

import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.trade.domain.TradeRequest;
import com.hjs.foodshare.trade.domain.TradeRequestStatus;
import com.hjs.foodshare.user.domain.FreshnessGrade;
import com.hjs.foodshare.user.domain.User;
import java.time.LocalDateTime;

public record TradeRequestResponse(
        Long requestId,
        Long postId,
        String postTitle,
        PostType postType,
        Long requesterId,
        String requesterNickname,
        String requesterProfileImage,
        double requesterFreshness,
        String requesterFreshnessLevel,
        String requesterFreshnessIcon,
        String requesterFreshnessLabel,
        long requesterShareCompletedCount,
        long requesterSaleCompletedCount,
        long requesterReceivedShareCount,
        long requesterGroupBuyCount,
        Long chatRoomId,
        TradeRequestStatus status,
        LocalDateTime createdAt,
        LocalDateTime respondedAt,
        LocalDateTime completedAt
) {

    public static TradeRequestResponse from(TradeRequest tradeRequest) {
        return from(tradeRequest, 0, 0, 0, 0, null);
    }

    public static TradeRequestResponse from(
            TradeRequest tradeRequest,
            long requesterShareCompletedCount,
            long requesterSaleCompletedCount,
            long requesterReceivedShareCount,
            long requesterGroupBuyCount,
            Long chatRoomId
    ) {
        User requester = tradeRequest.getRequester();
        double freshness = requester.getFreshnessScore();
        FreshnessGrade freshnessGrade = FreshnessGrade.fromScore(freshness);
        return new TradeRequestResponse(
                tradeRequest.getId(),
                tradeRequest.getPost().getId(),
                tradeRequest.getPost().getTitle(),
                tradeRequest.getPost().getPostType(),
                requester.getId(),
                requester.getNickname(),
                requester.getProfileImage(),
                freshness,
                freshnessGrade.name(),
                freshnessGrade.getIcon(),
                freshnessGrade.getLabel(),
                requesterShareCompletedCount,
                requesterSaleCompletedCount,
                requesterReceivedShareCount,
                requesterGroupBuyCount,
                chatRoomId,
                tradeRequest.getStatus(),
                tradeRequest.getCreatedAt(),
                tradeRequest.getRespondedAt(),
                tradeRequest.getCompletedAt()
        );
    }
}
