package com.hjs.foodshare;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.hjs.foodshare.badge.dto.BadgeSummaryResponse;
import com.hjs.foodshare.badge.service.BadgeService;
import com.hjs.foodshare.comment.dto.CommentCreateRequest;
import com.hjs.foodshare.comment.service.CommentService;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.moderation.domain.ReportTargetType;
import com.hjs.foodshare.moderation.dto.ReportCreateRequest;
import com.hjs.foodshare.moderation.dto.ReportResponse;
import com.hjs.foodshare.moderation.service.ModerationService;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.post.dto.PostCreateRequest;
import com.hjs.foodshare.post.service.PostService;
import com.hjs.foodshare.trade.service.TradeRequestService;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ModerationAndBadgeTests {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PostService postService;

    @Autowired
    private CommentService commentService;

    @Autowired
    private TradeRequestService tradeRequestService;

    @Autowired
    private ModerationService moderationService;

    @Autowired
    private BadgeService badgeService;

    @Test
    void reportPostCreatesPendingReportForPostWriter() {
        User writer = saveUser("report_writer");
        User reporter = saveUser("reporter");
        Long postId = postService.createPost(writer.getId(), shareRequest("Report target")).postId();

        ReportResponse response = moderationService.createReport(
                reporter.getId(),
                new ReportCreateRequest(ReportTargetType.POST, postId, "부적절한 게시글", "상세 사유")
        );

        assertEquals(reporter.getId(), response.reporterId());
        assertEquals(writer.getId(), response.targetUserId());
        assertEquals(ReportTargetType.POST, response.targetType());
    }

    @Test
    void blockPreventsTradeRequestAndCommentAndHidesPosts() {
        User writer = saveUser("block_writer");
        User blocked = saveUser("blocked_user");
        Long postId = postService.createPost(writer.getId(), shareRequest("Blocked post")).postId();

        moderationService.blockUser(writer.getId(), blocked.getId());

        BusinessException tradeError = assertThrows(BusinessException.class,
                () -> tradeRequestService.createRequest(postId, blocked.getId()));
        assertEquals(HttpStatus.FORBIDDEN, tradeError.getStatus());

        BusinessException commentError = assertThrows(BusinessException.class,
                () -> commentService.createComment(postId, blocked.getId(), new CommentCreateRequest("댓글")));
        assertEquals(HttpStatus.FORBIDDEN, commentError.getStatus());

        assertFalse(postService.searchPosts(null, "Blocked", null, null, null, null, null, blocked.getId())
                .stream()
                .anyMatch(post -> post.postId().equals(postId)));
    }

    @Test
    void badgesAreCalculatedFromUserActivity() {
        User writer = saveUser("badge_writer");
        postService.createPost(writer.getId(), shareRequest("Badge post"));

        BadgeSummaryResponse response = badgeService.getMyBadges(writer.getId());

        assertTrue(response.totalCount() >= 1);
        assertTrue(response.badges().stream()
                .anyMatch(badge -> badge.badgeId().equals("FIRST_POST") && badge.achieved()));
        assertTrue(response.achievedCount() >= 1);
    }

    private User saveUser(String suffix) {
        return userRepository.save(User.create(
                "User " + suffix,
                "nick_" + suffix,
                suffix + "@foodshare.test",
                "{noop}password",
                "010-" + Math.abs(suffix.hashCode() % 9000 + 1000) + "-" + Math.abs(suffix.hashCode() % 9000 + 1000),
                "Seoul"
        ));
    }

    private PostCreateRequest shareRequest(String title) {
        return new PostCreateRequest(
                PostType.SHARE,
                title,
                "Apple",
                "1 box",
                0,
                "Seoul",
                0.0,
                37.5,
                127.0,
                LocalDate.now().plusDays(5),
                null,
                "share",
                null,
                null,
                null
        );
    }
}
