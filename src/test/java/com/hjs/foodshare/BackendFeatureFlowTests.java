package com.hjs.foodshare;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.notification.repository.NotificationRepository;
import com.hjs.foodshare.notification.service.ExpiringPostNotificationService;
import com.hjs.foodshare.notification.service.NotificationService;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.post.domain.PostStatus;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.post.dto.PostCreateRequest;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.post.service.PostService;
import com.hjs.foodshare.trade.repository.TradeRequestRepository;
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
class BackendFeatureFlowTests {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private TradeRequestRepository tradeRequestRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private PostService postService;

    @Autowired
    private TradeRequestService tradeRequestService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ExpiringPostNotificationService expiringPostNotificationService;

    @Test
    void groupBuyAcceptIncreasesParticipantCountAndClosesWhenFull() {
        User writer = saveUser("writer1");
        User requester = saveUser("requester1");
        Long postId = postService.createPost(
                writer.getId(),
                groupBuyRequest("Group apples", 1, 2, LocalDate.now().plusDays(2))
        ).postId();

        Long requestId = tradeRequestService.createRequest(postId, requester.getId()).requestId();
        tradeRequestService.accept(requestId, writer.getId());

        Post post = postRepository.findById(postId).orElseThrow();
        assertEquals(2, post.getCurrentParticipantCount());
        assertEquals(PostStatus.CLOSED, post.getStatus());
        assertEquals(1, notificationRepository.findAllByUserIdOrderByCreatedAtDesc(requester.getId()).size());
    }

    @Test
    void groupBuyRequiresTargetCountAndDeadline() {
        User writer = saveUser("writer2");

        BusinessException targetError = assertThrows(BusinessException.class, () -> postService.createPost(
                writer.getId(),
                groupBuyRequest("No target", 1, null, LocalDate.now().plusDays(2))
        ));
        assertEquals(HttpStatus.BAD_REQUEST, targetError.getStatus());

        BusinessException deadlineError = assertThrows(BusinessException.class, () -> postService.createPost(
                writer.getId(),
                groupBuyRequest("No deadline", 1, 3, null)
        ));
        assertEquals(HttpStatus.BAD_REQUEST, deadlineError.getStatus());
    }

    @Test
    void notificationReadIsLimitedToOwner() {
        User owner = saveUser("owner1");
        User other = saveUser("other1");

        notificationService.createNotification(owner.getId(), "TEST", "테스트", "권한 확인");
        Long notificationId = notificationRepository.findAllByUserIdOrderByCreatedAtDesc(owner.getId()).get(0).getId();

        BusinessException error = assertThrows(BusinessException.class,
                () -> notificationService.markAsRead(other.getId(), notificationId));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        assertFalse(notificationRepository.findById(notificationId).orElseThrow().isRead());
    }

    @Test
    void expiringSoonNotificationIsCreatedOnlyOnce() {
        User writer = saveUser("writer3");
        postRepository.save(Post.create(
                writer,
                PostType.SHARE,
                "Expiring tofu",
                "Tofu",
                "1 pack",
                0,
                "Seoul",
                0.0,
                LocalDate.now().plusDays(1),
                37.5,
                127.0,
                null,
                "expiring soon",
                null,
                null,
                null
        ));

        expiringPostNotificationService.notifyExpiringPosts();
        expiringPostNotificationService.notifyExpiringPosts();

        var notifications = notificationRepository.findAllByUserIdOrderByCreatedAtDesc(writer.getId());
        assertEquals(1, notifications.size());
        assertEquals("EXPIRING_SOON", notifications.get(0).getType());
        assertTrue(notifications.get(0).getMessage().contains("유통기한"));
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

    private PostCreateRequest groupBuyRequest(String title, Integer currentCount, Integer targetCount, LocalDate deadline) {
        return new PostCreateRequest(
                PostType.GROUP_BUY,
                title,
                "Apple",
                "10 boxes",
                10000,
                "Seoul",
                0.0,
                37.5,
                127.0,
                LocalDate.now().plusDays(5),
                null,
                "group buy",
                currentCount,
                targetCount,
                deadline
        );
    }
}
