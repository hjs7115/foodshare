package com.hjs.foodshare.admin.controller;

import com.hjs.foodshare.admin.dto.AdminStatsResponse;
import com.hjs.foodshare.admin.dto.ReportStatusUpdateRequest;
import com.hjs.foodshare.admin.service.AdminService;
import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.response.PageResponse;
import com.hjs.foodshare.moderation.dto.ReportResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminStatsResponse>> getStats(
            @RequestHeader(value = "X-Admin-Token", required = false) String adminToken
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Admin stats found.", adminService.getStats(adminToken)));
    }

    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<PageResponse<ReportResponse>>> getReports(
            @RequestHeader(value = "X-Admin-Token", required = false) String adminToken,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Reports found.", adminService.getReports(adminToken, page, size)));
    }

    @PatchMapping("/reports/{reportId}")
    public ResponseEntity<ApiResponse<ReportResponse>> updateReportStatus(
            @RequestHeader(value = "X-Admin-Token", required = false) String adminToken,
            @PathVariable Long reportId,
            @Valid @RequestBody ReportStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Report status updated.",
                adminService.updateReportStatus(adminToken, reportId, request)));
    }
}
