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

    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager em;
    @org.springframework.beans.factory.annotation.Autowired private com.hjs.foodshare.notification.service.NotificationService notifications;
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
        String action=request.action()==null?"NONE":request.action();
        if(!"NONE".equals(action) && (request.resolution()==null||request.resolution().isBlank()))throw new BusinessException(HttpStatus.BAD_REQUEST,"조치 사유를 입력해주세요.");
        switch(action){
            case "HIDE_POST" -> {
                if(report.getTargetType()!=com.hjs.foodshare.moderation.domain.ReportTargetType.POST)throw new BusinessException(HttpStatus.BAD_REQUEST,"게시글 신고에만 적용할 수 있습니다.");
                var post=postRepository.findById(report.getTargetId()).orElseThrow();em.refresh(post,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);post.delete();
                tradeRequestRepository.findAllByPostIdAndStatus(post.getId(),TradeRequestStatus.PENDING).forEach(r->{r.reject();notifications.createNotification(r.getRequester().getId(),"TRADE_CANCELLED","요청 종료","운영자에 의해 글이 숨겨져 요청이 종료되었습니다.","TRADE_REQUEST",r.getId());});
            }
            case "SUSPEND_USER" -> {em.refresh(report.getTargetUser(),jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);report.getTargetUser().suspend(true);}
            case "RESTORE_USER" -> {em.refresh(report.getTargetUser(),jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);report.getTargetUser().suspend(false);}
            case "CANCEL_TRADE" -> cancelReportedTrade(report,request.resolution());
            case "NONE" -> {}
            default -> throw new BusinessException(HttpStatus.BAD_REQUEST,"지원하지 않는 조치입니다.");
        }
        report.resolve(action,request.resolution());
        report.updateStatus(request.status());
        notifications.createNotification(report.getReporter().getId(),"REPORT_RESULT","신고 처리 안내",request.resolution()==null?"신고 처리 상태가 변경되었습니다.":request.resolution(),"REPORT",report.getId());
        return ReportResponse.from(report);
    }

    private void cancelReportedTrade(com.hjs.foodshare.moderation.domain.Report report,String reason){
        if(report.getTargetType()!=com.hjs.foodshare.moderation.domain.ReportTargetType.TRADE_REQUEST)throw new BusinessException(HttpStatus.BAD_REQUEST,"거래 신고에만 적용할 수 있습니다.");
        var trade=tradeRequestRepository.findById(report.getTargetId()).orElseThrow();
        em.refresh(trade.getPost(),jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);em.refresh(trade,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        trade.cancel(report.getReporter().getId(),"운영자 조정: "+reason.substring(0,Math.min(70,reason.length())));
        em.createQuery("select e from FridgeExchange e where e.trade.id=:id",com.hjs.foodshare.fridge.exchange.FridgeExchange.class).setParameter("id",trade.getId()).getResultList().forEach(e->{e.end("CANCELLED");e.clearCancellation();});
        var reviews=em.createQuery("select r from Review r where r.tradeRequest.id=:id",com.hjs.foodshare.review.domain.Review.class).setParameter("id",trade.getId()).getResultList();
        reviews.forEach(em::remove);em.flush();
        for(var user:java.util.List.of(trade.getRequester(),trade.getPost().getWriter()).stream().sorted(java.util.Comparator.comparing(com.hjs.foodshare.user.domain.User::getId)).toList()){
            em.refresh(user,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            var remaining=em.createQuery("select r from Review r where r.targetUser.id=:id order by r.createdAt,r.id",com.hjs.foodshare.review.domain.Review.class).setParameter("id",user.getId()).getResultList();
            double score=com.hjs.foodshare.review.service.FreshnessCalculator.baseScore();for(var r:remaining)score=com.hjs.foodshare.review.service.FreshnessCalculator.update(score,r.getRating());user.updateFreshnessScore(score);
            notifications.createNotification(user.getId(),"TRADE_CANCELLED","거래 분쟁 조정",reason,"TRADE_REQUEST",trade.getId());
        }
    }

    private void validateAdminToken(String requestToken) {
        if (adminToken.length()<32 || "local-admin-token".equals(adminToken) || requestToken == null || requestToken.isBlank() || !java.security.MessageDigest.isEqual(requestToken.getBytes(java.nio.charset.StandardCharsets.UTF_8),adminToken.getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Admin token is invalid.");
        }
    }
}
