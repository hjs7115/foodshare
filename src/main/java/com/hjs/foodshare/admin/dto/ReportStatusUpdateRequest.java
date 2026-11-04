package com.hjs.foodshare.admin.dto;

import com.hjs.foodshare.moderation.domain.ReportStatus;
import jakarta.validation.constraints.NotNull;

public record ReportStatusUpdateRequest(
        @NotNull ReportStatus status,
        @jakarta.validation.constraints.Pattern(regexp="NONE|HIDE_POST|SUSPEND_USER|RESTORE_USER|CANCEL_TRADE") String action,
        @jakarta.validation.constraints.Size(max=500) String resolution
) {
    public ReportStatusUpdateRequest(ReportStatus status){this(status,"NONE",null);}
}
