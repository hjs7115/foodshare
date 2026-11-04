package com.hjs.foodshare;

import com.hjs.foodshare.chat.service.ChatService;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.notification.service.FcmPushService;
import com.hjs.foodshare.post.domain.*;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.review.dto.ReviewCreateRequest;
import com.hjs.foodshare.review.service.ReviewService;
import com.hjs.foodshare.trade.domain.TradeRequestStatus;
import com.hjs.foodshare.trade.repository.TradeRequestRepository;
import com.hjs.foodshare.trade.service.TradeRequestService;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Supplier;
import org.junit.jupiter.api.RepeatedTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

/** Real committed transactions on separate threads, against the isolated test database. */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:exhibition-races;MODE=MySQL;DATABASE_TO_LOWER=TRUE")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ExhibitionConcurrencyTests {
    @Autowired UserRepository users;
    @Autowired PostRepository posts;
    @Autowired TradeRequestRepository requests;
    @Autowired TradeRequestService trades;
    @Autowired ChatService chats;
    @Autowired ReviewService reviews;
    @Autowired PlatformTransactionManager manager;
    @MockitoBean FcmPushService fcm;

    record Fixture(Long owner, Long buyer, Long other, Long post, Long first, Long second) {}

    private <T> T tx(Supplier<T> action) {
        return new TransactionTemplate(manager).execute(status -> action.get());
    }

    private User user() {
        String id = UUID.randomUUID().toString().replace("-", "");
        return users.save(User.create("테스트", id.substring(0, 12), id + "@race.local",
                "unused-password", id.substring(0, 20), "서울 강남구 역삼동"));
    }

    private Fixture fixture(boolean group) {
        return tx(() -> {
            var owner = user(); var buyer = user(); var other = user();
            var post = posts.save(Post.create(owner, group ? PostType.GROUP_BUY : PostType.SALE,
                    "동시 요청 검증", "두부", "1개", 1000, "서울 강남구 역삼동", 0.0,
                    LocalDate.now().plusDays(3), 37.5, 127.0, null, "테스트",
                    group ? 1 : null, group ? 2 : null,
                    group ? LocalDateTime.now().plusDays(1) : null));
            Long first = trades.createRequest(post.getId(), buyer.getId()).requestId();
            Long second = trades.createRequest(post.getId(), other.getId()).requestId();
            return new Fixture(owner.getId(), buyer.getId(), other.getId(), post.getId(), first, second);
        });
    }

    private <T> List<T> race(Callable<T> first, Callable<T> second) throws Exception {
        var pool = Executors.newFixedThreadPool(2);
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        try {
            List<Future<T>> futures = new ArrayList<>();
            for (var action : List.of(first, second)) futures.add(pool.submit(() -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) throw new TimeoutException("start gate");
                return action.call();
            }));
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            List<T> results = new ArrayList<>();
            for (var future : futures) results.add(future.get(25, TimeUnit.SECONDS));
            return results;
        } finally { pool.shutdownNow(); }
    }

    private boolean accepted(Long id, Long owner) {
        try { trades.accept(id, owner); return true; }
        catch (BusinessException expected) { return false; }
    }

    @RepeatedTest(5) void simultaneousNewRequestsCannotDuplicateSameBuyer() throws Exception {
        var f = fixture(false);
        // Withdraw the fixture request so both threads race to create a fresh one.
        trades.cancelMarketTrade(f.first, f.buyer, "기타");
        Callable<Boolean> create = () -> {
            try { trades.createRequest(f.post, f.buyer); return true; }
            catch (BusinessException expected) { return false; }
        };
        assertEquals(1, race(create, create).stream().filter(Boolean::booleanValue).count());
        assertEquals(1, tx(() -> requests.findAllByPostIdAndStatus(f.post, TradeRequestStatus.PENDING)
                .stream().filter(r -> r.getRequester().getId().equals(f.buyer)).count()));
    }

    @RepeatedTest(5) void simultaneousSaleAcceptsOnlyOneBuyer() throws Exception {
        var f = fixture(false);
        assertEquals(1, race(() -> accepted(f.first, f.owner), () -> accepted(f.second, f.owner))
                .stream().filter(Boolean::booleanValue).count());
        assertEquals(1, tx(() -> requests.findAllByPostIdAndStatus(f.post, TradeRequestStatus.ACCEPTED).size()));
        assertEquals(1, chats.getRooms(f.owner, "ALL").size());
    }

    @RepeatedTest(5) void simultaneousGroupAcceptanceNeverExceedsCapacity() throws Exception {
        var f = fixture(true);
        assertEquals(1, race(() -> accepted(f.first, f.owner), () -> accepted(f.second, f.owner))
                .stream().filter(Boolean::booleanValue).count());
        tx(() -> { var p = posts.findById(f.post).orElseThrow();
            assertEquals(2, p.getCurrentParticipantCount()); assertFalse(p.isOpen()); return true; });
        assertEquals(1, chats.getRooms(f.owner, "ALL").size());
    }

    @RepeatedTest(5) void simultaneousConfirmationsPreserveBothVotes() throws Exception {
        var f = fixture(false); trades.accept(f.first, f.owner);
        race(() -> trades.complete(f.first, f.owner), () -> trades.complete(f.first, f.buyer));
        tx(() -> { var r = requests.findById(f.first).orElseThrow();
            assertEquals(TradeRequestStatus.COMPLETED, r.getStatus());
            assertNotNull(r.getWriterConfirmedAt()); assertNotNull(r.getRequesterConfirmedAt()); return true; });
    }

    @RepeatedTest(5) void cancellationRacingFirstConfirmationAlwaysCancels() throws Exception {
        var f = fixture(false); trades.accept(f.first, f.owner);
        race(() -> { try { trades.complete(f.first, f.owner); } catch (BusinessException expected) {} return true; },
                () -> { trades.cancelMarketTrade(f.first, f.buyer, "기타"); return true; });
        assertEquals(TradeRequestStatus.CANCELLED, tx(() -> requests.findById(f.first).orElseThrow().getStatus()));
    }

    @RepeatedTest(5) void simultaneousReviewRetriesProduceOneReviewAndOneScoreChange() throws Exception {
        var f = fixture(false); trades.accept(f.first, f.owner);
        trades.complete(f.first, f.owner); trades.complete(f.first, f.buyer);
        Callable<Boolean> action = () -> {
            try { reviews.createReview(f.first, f.buyer, new ReviewCreateRequest(5, "좋아요")); return true; }
            catch (BusinessException expected) { return false; }
        };
        assertEquals(1, race(action, action).stream().filter(Boolean::booleanValue).count());
        assertEquals(1, reviews.getRatingSummary(f.owner).reviewCount());
        assertEquals(1, reviews.getRatingSummary(f.owner).ratingCounts().get(4));
    }

    @RepeatedTest(5) void simultaneousChatRetriesReturnSamePersistedMessage() throws Exception {
        var f = fixture(false); var accepted = trades.accept(f.first, f.owner);
        Callable<Long> send = () -> chats.sendMessage(f.buyer, accepted.chatRoomId(), "동시 재전송", "same-retry-id").messageId();
        var ids = race(send, send);
        assertEquals(ids.get(0), ids.get(1));
    }
}
