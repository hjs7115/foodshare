package com.hjs.foodshare.admin.dto;

import com.hjs.foodshare.moderation.domain.ReportStatus;
import jakarta.validation.constraints.NotNull;

public record ReportStatusUpdateRequest(
        @NotNull ReportStatus status
) {
}
