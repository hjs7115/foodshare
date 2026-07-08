package com.hjs.foodshare;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.hjs.foodshare.auth.dto.FindIdRequest;
import com.hjs.foodshare.auth.dto.LoginRequest;
import com.hjs.foodshare.auth.dto.PasswordResetLinkRequest;
import com.hjs.foodshare.auth.dto.ResetPasswordRequest;
import com.hjs.foodshare.auth.repository.EmailVerificationRepository;
import com.hjs.foodshare.auth.service.AuthService;
import com.hjs.foodshare.auth.service.MailService;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.fridge.dto.FridgeItemRequest;
import com.hjs.foodshare.fridge.repository.FridgeItemRepository;
import com.hjs.foodshare.fridge.service.FridgeItemService;
import com.hjs.foodshare.notification.repository.NotificationRepository;
import com.hjs.foodshare.notification.service.ExpiringPostNotificationService;
import com.hjs.foodshare.notification.service.NotificationService;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.post.domain.PostStatus;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.post.dto.PostCreateRequest;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.post.dto.PostSort;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
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
    private FridgeItemRepository fridgeItemRepository;

    @Autowired
    private EmailVerificationRepository emailVerificationRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private PostService postService;

    @Autowired
    private TradeRequestService tradeRequestService;

    @Autowired
    private FridgeItemService fridgeItemService;

    @Autowired
    private AuthService authService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ExpiringPostNotificationService expiringPostNotificationService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private MailService mailService;

    @Test
    void groupBuyAcceptKeepsPostOpenUntilRecruitmentClosed() {
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
        assertEquals(PostStatus.OPEN, post.getStatus());
        assertEquals(2, notificationRepository.findAllByUserIdOrderByCreatedAtDesc(requester.getId()).size());

        tradeRequestService.closeGroupBuyRecruitment(postId, writer.getId());

        post = postRepository.findById(postId).orElseThrow();
        assertEquals(PostStatus.CLOSED, post.getStatus());
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
    void receivedRequestsAreReturnedForPostWriter() {
        User writer = saveUser("received_writer");
        User requester = saveUser("received_requester");
        User otherWriter = saveUser("received_other");

        Long writerPostId = postService.createPost(writer.getId(), shareRequest("Writer apples")).postId();
        Long otherPostId = postService.createPost(otherWriter.getId(), shareRequest("Other apples")).postId();

        tradeRequestService.createRequest(writerPostId, requester.getId());
        tradeRequestService.createRequest(otherPostId, requester.getId());

        var writerRequests = tradeRequestService.getReceivedRequests(writer.getId());

        assertEquals(1, writerRequests.size());
        assertEquals(writerPostId, writerRequests.get(0).postId());
    }

    @Test
    void myPageTradeHistoryReturnsSentAndReceivedPendingRequests() {
        User writer = saveUser("history_writer");
        User requester = saveUser("history_requester");
        Long postId = postService.createPost(writer.getId(), shareRequest("History apples")).postId();

        Long requestId = tradeRequestService.createRequest(postId, requester.getId()).requestId();

        var sentRequests = tradeRequestService.getMyRequests(requester.getId());
        var receivedRequests = tradeRequestService.getReceivedRequests(writer.getId());

        assertEquals(1, sentRequests.size());
        assertEquals(requestId, sentRequests.get(0).requestId());
        assertEquals(postId, sentRequests.get(0).postId());

        assertEquals(1, receivedRequests.size());
        assertEquals(requestId, receivedRequests.get(0).requestId());
        assertEquals(postId, receivedRequests.get(0).postId());
    }

    @Test
    void postSortSupportsFreshnessPriceAndFrontendAliases() {
        assertEquals(PostSort.LATEST, PostSort.from("latest"));
        assertEquals(PostSort.EXPIRING_SOON, PostSort.from("expiry"));
        assertEquals(PostSort.FRESHNESS, PostSort.from("rating"));
        assertEquals(PostSort.DISTANCE, PostSort.from("distance"));
        assertEquals(PostSort.PRICE_LOW, PostSort.from("price"));
    }

    @Test
    void postsCanBeSortedByFreshnessAndPrice() {
        User freshWriter = saveUser("fresh_writer");
        freshWriter.updateFreshnessScore(90.0);
        User normalWriter = saveUser("normal_writer");
        normalWriter.updateFreshnessScore(50.0);

        Long expensivePostId = postService.createPost(
                freshWriter.getId(),
                customShareRequest("Expensive fresh apples", 5000, LocalDate.now().plusDays(5), 37.500, 127.000)
        ).postId();
        Long cheapPostId = postService.createPost(
                normalWriter.getId(),
                customShareRequest("Cheap normal apples", 1000, LocalDate.now().plusDays(2), 37.501, 127.000)
        ).postId();

        var freshnessSorted = postService.searchPosts(null, null, null, null, null, null, PostSort.FRESHNESS, null);
        assertEquals(expensivePostId, freshnessSorted.get(0).postId());

        var priceSorted = postService.searchPosts(null, null, null, null, null, null, PostSort.PRICE_LOW, null);
        assertEquals(cheapPostId, priceSorted.get(0).postId());
    }

    @Test
    void fridgeItemsAreStoredPerUserInDatabase() {
        User owner = saveUser("fridge_owner");
        User other = saveUser("fridge_other");

        var created = fridgeItemService.createItem(owner.getId(), new FridgeItemRequest(
                "Tomato",
                "2 pcs",
                LocalDate.now().plusDays(2),
                "냉장",
                "Use soon"
        ));

        assertEquals(1, fridgeItemRepository.findAllByUserIdOrderByExpiryDateAscCreatedAtAsc(owner.getId()).size());
        assertEquals(0, fridgeItemService.getItems(other.getId()).size());
        assertTrue(created.expiringSoon());

        var updated = fridgeItemService.updateItem(owner.getId(), created.id(), new FridgeItemRequest(
                "Tomato pack",
                "3 pcs",
                LocalDate.now().plusDays(5),
                "냉동",
                "Saved"
        ));
        assertEquals("Tomato pack", updated.name());
        assertEquals("냉동", updated.storagePlace());

        assertThrows(BusinessException.class,
                () -> fridgeItemService.updateItem(other.getId(), created.id(), new FridgeItemRequest(
                        "Other",
                        "1",
                        LocalDate.now().plusDays(1),
                        "냉장",
                        ""
                )));

        fridgeItemService.deleteItem(owner.getId(), created.id());
        assertEquals(0, fridgeItemService.getItems(owner.getId()).size());
    }

    @Test
    void authUsesEmailAndPasswordResetCodes() {
        User user = userRepository.save(User.create(
                "Recover User",
                "recover_id",
                "recover@foodshare.test",
                passwordEncoder.encode("Password123!"),
                "010-1111-2222",
                "Seoul"
        ));

        var loginResponse = authService.login(new LoginRequest("recover@foodshare.test", "Password123!"));
        assertEquals(user.getId(), loginResponse.user().userId());

        var findIdResponse = authService.findId(new FindIdRequest(
                "Recover User",
                "recover@foodshare.test"
        ));
        assertEquals("recover@foodshare.test", findIdResponse.email());

        authService.requestPasswordResetLink(new PasswordResetLinkRequest("recover@foodshare.test"));
        String resetCode = emailVerificationRepository.findFirstByEmailOrderByCreatedAtDesc("recover@foodshare.test")
                .orElseThrow()
                .getCode();
        authService.resetPassword(new ResetPasswordRequest("recover@foodshare.test", resetCode, "NewPassword123!"));

        var resetLoginResponse = authService.login(new LoginRequest("recover@foodshare.test", "NewPassword123!"));
        assertEquals(user.getId(), resetLoginResponse.user().userId());
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
    void unreadNotificationCountChangesAfterRead() {
        User owner = saveUser("owner_unread");

        notificationService.createNotification(owner.getId(), "TEST", "Test 1", "Unread 1");
        notificationService.createNotification(owner.getId(), "TEST", "Test 2", "Unread 2");
        assertEquals(2, notificationService.getUnreadCount(owner.getId()).unreadCount());

        Long notificationId = notificationRepository.findAllByUserIdOrderByCreatedAtDesc(owner.getId()).get(0).getId();
        notificationService.markAsRead(owner.getId(), notificationId);

        assertEquals(1, notificationService.getUnreadCount(owner.getId()).unreadCount());
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

    private PostCreateRequest shareRequest(String title) {
        return customShareRequest(title, 0, LocalDate.now().plusDays(5), 37.5, 127.0);
    }

    private PostCreateRequest customShareRequest(String title, int price, LocalDate expirationDate,
                                                 double latitude, double longitude) {
        return new PostCreateRequest(
                PostType.SHARE,
                title,
                "Apple",
                "1 box",
                price,
                "Seoul",
                0.0,
                latitude,
                longitude,
                expirationDate,
                null,
                "share",
                null,
                null,
                null
        );
    }
}
