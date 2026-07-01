package com.hjs.foodshare.moderation.dto;

import com.hjs.foodshare.moderation.domain.Report;
import com.hjs.foodshare.moderation.domain.ReportStatus;
import com.hjs.foodshare.moderation.domain.ReportTargetType;
import java.time.LocalDateTime;

public record ReportResponse(
        Long reportId,
        Long reporterId,
        Long targetUserId,
        String targetNickname,
        ReportTargetType targetType,
        Long targetId,
        String reason,
        String description,
        ReportStatus status,
        LocalDateTime createdAt
) {

    public static ReportResponse from(Report report) {
        return new ReportResponse(
                report.getId(),
                report.getReporter().getId(),
                report.getTargetUser().getId(),
                report.getTargetUser().getNickname(),
                report.getTargetType(),
                report.getTargetId(),
                report.getReason(),
                report.getDescription(),
                report.getStatus(),
                report.getCreatedAt()
        );
    }
}
