package com.hjs.foodshare.admin.service;

import com.hjs.foodshare.admin.dto.AdminStatsResponse;
import com.hjs.foodshare.admin.dto.ReportStatusUpdateRequest;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.global.response.PageResponse;
import com.hjs.foodshare.moderation.domain.Report;
import com.hjs.foodshare.moderation.domain.ReportStatus;
import com.hjs.foodshare.moderation.dto.ReportResponse;
import com.hjs.foodshare.moderation.repository.ReportRepository;
import com.hjs.foodshare.notification.repository.NotificationRepository;
import com.hjs.foodshare.post.domain.PostStatus;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.review.repository.ReviewRepository;
import com.hjs.foodshare.trade.domain.TradeRequestStatus;
import com.hjs.foodshare.trade.repository.TradeRequestRepository;
import com.hjs.foodshare.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AdminService {

    private final String adminToken;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final TradeRequestRepository tradeRequestRepository;
    private final ReviewRepository reviewRepository;
    private final NotificationRepository notificationRepository;
    private final ReportRepository reportRepository;

    public AdminService(
            @Value("${app.admin.token:local-admin-token}") String adminToken,
            UserRepository userRepository,
            PostRepository postRepository,
            TradeRequestRepository tradeRequestRepository,
            ReviewRepository reviewRepository,
            NotificationRepository notificationRepository,
            ReportRepository reportRepository
    ) {
        this.adminToken = adminToken;
        this.userRepository = userRepository;
        this.postRepository = postRepository;
        this.tradeRequestRepository = tradeRequestRepository;
        this.reviewRepository = reviewRepository;
        this.notificationRepository = notificationRepository;
        this.reportRepository = reportRepository;
    }

    public AdminStatsResponse getStats(String requestToken) {
        validateAdminToken(requestToken);
        return new AdminStatsResponse(
                userRepository.count(),
                postRepository.countByDeletedFalse(),
                postRepository.countByDeletedFalseAndStatus(PostStatus.OPEN),
                tradeRequestRepository.count(),
                tradeRequestRepository.countByStatus(TradeRequestStatus.COMPLETED),
                reviewRepository.count(),
                notificationRepository.count(),
                reportRepository.count(),
                reportRepository.countByStatus(ReportStatus.PENDING)
        );
    }

    public PageResponse<ReportResponse> getReports(String requestToken, int page, int size) {
        validateAdminToken(requestToken);
        var reportPage = reportRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
        return new PageResponse<>(
                reportPage.getContent().stream().map(ReportResponse::from).toList(),
                reportPage.getNumber(),
                reportPage.getSize(),
                reportPage.getTotalElements(),
                reportPage.getTotalPages(),
                reportPage.isFirst(),
                reportPage.isLast()
        );
    }

    @Transactional
    public ReportResponse updateReportStatus(String requestToken, Long reportId, ReportStatusUpdateRequest request) {
        validateAdminToken(requestToken);
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Report not found."));
        report.updateStatus(request.status());
        return ReportResponse.from(report);
    }

    private void validateAdminToken(String requestToken) {
        if (requestToken == null || requestToken.isBlank() || !requestToken.equals(adminToken)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Admin token is invalid.");
        }
    }
}
