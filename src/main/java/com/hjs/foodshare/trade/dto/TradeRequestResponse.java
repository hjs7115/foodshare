package com.hjs.foodshare.trade.dto;

import com.hjs.foodshare.trade.domain.TradeRequest;
import com.hjs.foodshare.trade.domain.TradeRequestStatus;
import java.time.LocalDateTime;

public record TradeRequestResponse(
        Long requestId,
        Long postId,
        String postTitle,
        Long requesterId,
        String requesterNickname,
        TradeRequestStatus status,
        LocalDateTime createdAt,
        LocalDateTime respondedAt,
        LocalDateTime completedAt
) {

    public static TradeRequestResponse from(TradeRequest tradeRequest) {
        return new TradeRequestResponse(
                tradeRequest.getId(),
                tradeRequest.getPost().getId(),
                tradeRequest.getPost().getTitle(),
                tradeRequest.getRequester().getId(),
                tradeRequest.getRequester().getNickname(),
                tradeRequest.getStatus(),
                tradeRequest.getCreatedAt(),
                tradeRequest.getRespondedAt(),
                tradeRequest.getCompletedAt()
        );
    }
}
