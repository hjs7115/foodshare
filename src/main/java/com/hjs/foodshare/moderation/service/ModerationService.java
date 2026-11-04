package com.hjs.foodshare.moderation.service;

import com.hjs.foodshare.comment.domain.Comment;
import com.hjs.foodshare.comment.repository.CommentRepository;
import com.hjs.foodshare.chat.service.ChatService;
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

    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager em;
    private final ReportRepository reportRepository;
    private final UserBlockRepository userBlockRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final ChatService chatService;

    public ModerationService(ReportRepository reportRepository, UserBlockRepository userBlockRepository,
                             UserRepository userRepository, PostRepository postRepository,
                             CommentRepository commentRepository, ChatService chatService) {
        this.reportRepository = reportRepository;
        this.userBlockRepository = userBlockRepository;
        this.userRepository = userRepository;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.chatService = chatService;
    }

    @Transactional
    public ReportResponse createReport(Long reporterId, ReportCreateRequest request) {
        User reporter = getUser(reporterId);
        User targetUser = resolveTargetUser(request.targetType(), request.targetId());
        String evidence=null;
        if(request.targetType()==ReportTargetType.CHAT_MESSAGE){
            var message=em.find(com.hjs.foodshare.chat.domain.ChatMessage.class,request.targetId());
            if(!chatService.canAccessRoom(reporterId,message.getChatRoom().getId()))throw new BusinessException(HttpStatus.FORBIDDEN,"참여한 채팅만 신고할 수 있습니다.");
            evidence="room="+message.getChatRoom().getId()+", sender="+targetUser.getId()+", at="+message.getCreatedAt()+"\n"+message.getContent();
        }
        if(request.targetType()==ReportTargetType.TRADE_REQUEST){
            var trade=em.find(com.hjs.foodshare.trade.domain.TradeRequest.class,request.targetId());
            if(!trade.getRequester().getId().equals(reporterId)&&!trade.getPost().getWriter().getId().equals(reporterId))throw new BusinessException(HttpStatus.FORBIDDEN,"참여한 거래만 신고할 수 있습니다.");
            targetUser=trade.getRequester().getId().equals(reporterId)?trade.getPost().getWriter():trade.getRequester();
            evidence="post="+trade.getPost().getId()+", status="+trade.getStatus()+", price="+trade.getPost().getPrice()+", quantity="+trade.getPost().getQuantity();
        }
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
        report.recordEvidence(evidence);
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
        BlockedUserResponse response = BlockedUserResponse.from(userBlockRepository.save(UserBlock.create(blocker, blockedUser)));
        chatService.leaveDirectRoomsBetweenUsers(blockerId, blockedUserId);
        var pending=em.createQuery("select t from TradeRequest t where t.status=com.hjs.foodshare.trade.domain.TradeRequestStatus.PENDING and ((t.requester.id=:a and t.post.writer.id=:b) or (t.requester.id=:b and t.post.writer.id=:a)) order by t.post.id,t.id",com.hjs.foodshare.trade.domain.TradeRequest.class).setParameter("a",blockerId).setParameter("b",blockedUserId).getResultList();
        for(var request:pending){em.refresh(request.getPost(),jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);em.refresh(request);if(request.getStatus()==com.hjs.foodshare.trade.domain.TradeRequestStatus.PENDING)request.reject();}
        // A concurrent accept may have committed a new room while we waited for its post.
        chatService.leaveDirectRoomsBetweenUsers(blockerId, blockedUserId);
        return response;
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
            case CHAT_MESSAGE -> {
                var message=em.find(com.hjs.foodshare.chat.domain.ChatMessage.class,targetId);
                if(message==null||message.getSender()==null)throw new BusinessException(HttpStatus.NOT_FOUND,"메시지를 찾을 수 없습니다.");
                yield message.getSender();
            }
            case TRADE_REQUEST -> {
                var trade=em.find(com.hjs.foodshare.trade.domain.TradeRequest.class,targetId);
                if(trade==null)throw new BusinessException(HttpStatus.NOT_FOUND,"거래를 찾을 수 없습니다.");
                yield trade.getPost().getWriter();
            }
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
