package com.hjs.foodshare.moderation.dto;

import com.hjs.foodshare.moderation.domain.ReportTargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReportCreateRequest(
        @NotNull ReportTargetType targetType,
        @NotNull Long targetId,
        @NotBlank @Size(max = 100) String reason,
        String description
) {
}
