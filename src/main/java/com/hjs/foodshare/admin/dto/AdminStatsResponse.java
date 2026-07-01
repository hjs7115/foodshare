package com.hjs.foodshare.admin.dto;

public record AdminStatsResponse(
        long userCount,
        long postCount,
        long openPostCount,
        long tradeRequestCount,
        long completedTradeCount,
        long reviewCount,
        long notificationCount,
        long reportCount,
        long pendingReportCount
) {
}
