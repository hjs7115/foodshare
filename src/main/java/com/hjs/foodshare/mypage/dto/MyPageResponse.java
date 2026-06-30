package com.hjs.foodshare.mypage.dto;

import com.hjs.foodshare.auth.dto.UserResponse;

public record MyPageResponse(
        UserResponse user,
        int myPostCount,
        int myCommentCount,
        int myTradeRequestCount,
        int receivedTradeRequestCount,
        double averageRating,
        long reviewCount
) {
}
