package com.hjs.foodshare.moderation.service;

import com.hjs.foodshare.comment.domain.Comment;
import com.hjs.foodshare.comment.repository.CommentRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.moderation.domain.Report;
import com.hjs.foodshare.moderation.domain.ReportTargetType;
import com.hjs.foodshare.moderation.domain.UserBlock;
import com.hjs.foodshare.moderation.dto.BlockedUserResponse;
import com.hjs.foodshare.moderation.dto.ReportCreateRequest;
import com.hjs.foodshare.moderation.dto.ReportResponse;
import com.hjs.foodshare.moderation.repository.ReportRepository;
import com.hjs.foodshare.moderation.repository.UserBlockRepository;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ModerationService {

    private final ReportRepository reportRepository;
    private final UserBlockRepository userBlockRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;

    public ModerationService(ReportRepository reportRepository, UserBlockRepository userBlockRepository,
                             UserRepository userRepository, PostRepository postRepository,
                             CommentRepository commentRepository) {
        this.reportRepository = reportRepository;
        this.userBlockRepository = userBlockRepository;
        this.userRepository = userRepository;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
    }

    @Transactional
    public ReportResponse createReport(Long reporterId, ReportCreateRequest request) {
        User reporter = getUser(reporterId);
        User targetUser = resolveTargetUser(request.targetType(), request.targetId());
        if (reporter.getId().equals(targetUser.getId())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "You cannot report yourself.");
        }
        if (reportRepository.existsByReporterIdAndTargetTypeAndTargetId(
                reporterId,
                request.targetType(),
                request.targetId()
        )) {
            throw new BusinessException(HttpStatus.CONFLICT, "You already reported this target.");
        }

        Report report = Report.create(
                reporter,
                targetUser,
                request.targetType(),
                request.targetId(),
                request.reason(),
                request.description()
        );
        return ReportResponse.from(reportRepository.save(report));
    }

    public List<ReportResponse> getMyReports(Long reporterId) {
        return reportRepository.findAllByReporterIdOrderByCreatedAtDesc(reporterId)
                .stream()
                .map(ReportResponse::from)
                .toList();
    }

    @Transactional
    public BlockedUserResponse blockUser(Long blockerId, Long blockedUserId) {
        User blocker = getUser(blockerId);
        User blockedUser = getUser(blockedUserId);
        if (blocker.getId().equals(blockedUser.getId())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "You cannot block yourself.");
        }
        if (userBlockRepository.existsByBlockerIdAndBlockedUserId(blockerId, blockedUserId)) {
            throw new BusinessException(HttpStatus.CONFLICT, "User is already blocked.");
        }
        return BlockedUserResponse.from(userBlockRepository.save(UserBlock.create(blocker, blockedUser)));
    }

    @Transactional
    public void unblockUser(Long blockerId, Long blockedUserId) {
        UserBlock block = userBlockRepository.findByBlockerIdAndBlockedUserId(blockerId, blockedUserId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Blocked user not found."));
        userBlockRepository.delete(block);
    }

    public List<BlockedUserResponse> getBlockedUsers(Long blockerId) {
        return userBlockRepository.findAllByBlockerIdOrderByCreatedAtDesc(blockerId)
                .stream()
                .map(BlockedUserResponse::from)
                .toList();
    }

    private User resolveTargetUser(ReportTargetType targetType, Long targetId) {
        return switch (targetType) {
            case USER -> getUser(targetId);
            case POST -> {
                Post post = postRepository.findById(targetId)
                        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Post not found."));
                yield post.getWriter();
            }
            case COMMENT -> {
                Comment comment = commentRepository.findById(targetId)
                        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Comment not found."));
                yield comment.getWriter();
            }
        };
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));
    }
}
