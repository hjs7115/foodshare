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
        Long writerId,
        String writerNickname,
        String writerProfileImage,
        double writerFreshness,
        String writerFreshnessLabel,
        long writerShareCompletedCount,
        long writerSaleCompletedCount,
        long writerReceivedShareCount,
        long writerGroupBuyCount,
        Long chatRoomId,
        TradeRequestStatus status,
        LocalDateTime createdAt,
        LocalDateTime respondedAt,
        LocalDateTime completedAt
) {

    public static TradeRequestResponse from(TradeRequest tradeRequest) {
        return from(tradeRequest, 0, 0, 0, 0, 0, 0, 0, 0, 0, null);
    }

    public static TradeRequestResponse from(
            TradeRequest tradeRequest,
            long requesterShareCompletedCount,
            long requesterSaleCompletedCount,
            long requesterReceivedShareCount,
            long requesterGroupBuyCount,
            long writerShareCompletedCount,
            long writerSaleCompletedCount,
            long writerReceivedShareCount,
            long writerGroupBuyCount,
            Long chatRoomId
    ) {
        User requester = tradeRequest.getRequester();
        User writer = tradeRequest.getPost().getWriter();
        double freshness = requester.getFreshnessScore();
        FreshnessGrade freshnessGrade = FreshnessGrade.fromScore(freshness);
        double writerFreshness = writer.getFreshnessScore();
        FreshnessGrade writerFreshnessGrade = FreshnessGrade.fromScore(writerFreshness);
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
                writer.getId(),
                writer.getNickname(),
                writer.getProfileImage(),
                writerFreshness,
                writerFreshnessGrade.getLabel(),
                writerShareCompletedCount,
                writerSaleCompletedCount,
                writerReceivedShareCount,
                writerGroupBuyCount,
                chatRoomId,
                tradeRequest.getStatus(),
                tradeRequest.getCreatedAt(),
                tradeRequest.getRespondedAt(),
                tradeRequest.getCompletedAt()
        );
    }
}
