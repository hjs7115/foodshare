package com.hjs.foodshare.demo;

import com.hjs.foodshare.chat.domain.ChatMessage;
import com.hjs.foodshare.chat.service.ChatService;
import com.hjs.foodshare.chat.websocket.ChatWebSocketHandler;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.review.dto.ReviewCreateRequest;
import com.hjs.foodshare.review.service.ReviewService;
import com.hjs.foodshare.trade.domain.TradeRequest;
import com.hjs.foodshare.trade.domain.TradeRequestStatus;
import com.hjs.foodshare.trade.service.TradeRequestService;
import com.hjs.foodshare.user.domain.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class DemoInboundSimulationService {
    @PersistenceContext private EntityManager em;
    @org.springframework.beans.factory.annotation.Autowired private DemoSafetyService safety;
    @org.springframework.beans.factory.annotation.Autowired private DemoMeetupService meetup;
    private final DemoVisibility demo;
    private final TradeRequestService trades;
    private final ChatService chats;
    private final ReviewService reviews;
    private final ChatWebSocketHandler websocket;
    private final DemoChatAi ai;
    private final TransactionTemplate tx;

    public DemoInboundSimulationService(DemoVisibility demo, TradeRequestService trades,
            ChatService chats, ReviewService reviews, ChatWebSocketHandler websocket,
            DemoChatAi ai, PlatformTransactionManager manager) {
        this.demo = demo; this.trades = trades; this.chats = chats;
        this.reviews = reviews; this.websocket = websocket; this.ai = ai;
        this.tx = new TransactionTemplate(manager);
    }

    /** All existing and newly registered accounts can receive an inbound demo request.
     *  Only pre-registered demo actors may send the automated request. */
    /** Invoked in the same transaction as ordinary post creation. */
    public void schedule(Post post) {
        if (!demo.enabled() || post == null || !post.isOpen()
                || demo.isTemplate(post.getId())) return;
        // Preserve the user's ordinary post even when this account has a demo cooldown.
        if (!safety.allowPost(post.getWriter().getId())) return;
        if (DemoSafetySignals.unmistakableHarassment(post.getTitle() + " " + post.getContent())) return;
        if (em.find(DemoInboundJob.class, post.getId()) == null)
            em.persist(new DemoInboundJob(post.getId(), post.getWriter().getId()));
    }

    public List<Long> due() {
        return tx.execute(status -> {
            if (!demo.enabled()) return List.of();
            return em.createQuery("select j.postId from DemoInboundJob j where j.finished=false and j.dueAt<=:now order by j.dueAt", Long.class)
                    .setParameter("now", LocalDateTime.now())
                    .setMaxResults(40).getResultList();
        });
    }

    public record Screening(Long postId, String title, String ingredient, String content, String imageUrl) {}

    /**
     * Reserve an unscreened post for a brief, fail-open check.
     * Image analysis occurs outside the transaction and cannot restrict accounts.
     */
    public Screening queueScreening(Long postId) {
        return tx.execute(status -> {
            if (!demo.enabled()) return null;
            DemoInboundJob job = em.find(DemoInboundJob.class, postId, LockModeType.PESSIMISTIC_WRITE);
            if (job == null || job.finished || job.screened || job.requestId != null
                    || job.dueAt.isAfter(LocalDateTime.now())) return null;
            Post post = em.find(Post.class, postId);
            if (post == null || post.isDeleted()) { job.finished = true; return null; }
            job.dueAt = LocalDateTime.now().plusSeconds(30);
            return new Screening(postId, post.getTitle(), post.getIngredientName(),
                    post.getContent(), post.getImageUrl());
        });
    }

    public void screenAndFinish(Screening candidate) {
        if (candidate == null) return;
        var verdict = ai.screenPost(candidate.title(), candidate.ingredient(),
                candidate.content(), candidate.imageUrl());
        boolean definitelyOffTopic = verdict != null && verdict.clearlyUnrelated()
                && DemoSafetySignals.clearOffTopicText(candidate.title(), candidate.content(),
                        candidate.ingredient());
        tx.executeWithoutResult(status -> {
            DemoInboundJob job = em.find(DemoInboundJob.class, candidate.postId(), LockModeType.PESSIMISTIC_WRITE);
            if (job == null || job.finished || job.requestId != null || job.screened) return;
            Post post = em.find(Post.class, job.postId);
            if (post == null || post.isDeleted()) { job.finished = true; return; }
            if (!java.util.Objects.equals(post.getTitle(), candidate.title())
                    || !java.util.Objects.equals(post.getContent(), candidate.content())
                    || !java.util.Objects.equals(post.getImageUrl(), candidate.imageUrl())) {
                job.dueAt = LocalDateTime.now().plusSeconds(2);
                return;
            }
            job.screened = true;
            if (definitelyOffTopic) {
                job.skippedForUnrelatedContent = true;
                job.finished = true;
            } else {
                job.dueAt = LocalDateTime.now();
            }
        });
    }

    public record Prompt(Long postId, Long requestId, long through, String conversation,
            String imageUrl, boolean greeting, String fallback, boolean review,
            DemoMeetupService.Point point) {}

    /** A failed transaction must be retried using a fresh transaction, not a rollback-only one. */
    public void deferFailure(Long postId) {
        tx.executeWithoutResult(status -> {
            DemoInboundJob job = em.find(DemoInboundJob.class, postId, LockModeType.PESSIMISTIC_WRITE);
            if (job == null || job.finished) return;
            job.attempts++;
            if (job.attempts >= 5) job.finished = true;
            else job.dueAt = LocalDateTime.now().plusSeconds(Math.min(60, job.attempts * 10L));
        });
    }


    /** DB preparation is committed before calling external AI. */
    public Prompt prepare(Long postId) {
        return tx.execute(status -> advance(postId));
    }

    private Prompt advance(Long postId) {
        if (!demo.enabled()) return null;
        DemoInboundJob job = em.find(DemoInboundJob.class, postId, LockModeType.PESSIMISTIC_WRITE);
        if (job == null || job.finished || job.dueAt.isAfter(LocalDateTime.now())) return null;
        Post post = em.find(Post.class, postId);
        if (post == null || post.isDeleted() || !post.getWriter().isAvailable()) {
            job.finished = true;
            return null;
        }
        if (!safety.canParticipate(job.writerId)) {
            job.dueAt = LocalDateTime.now().plusMinutes(5);
            return null;
        }
        if (job.requestId == null) {
            if (!job.screened) return null;
            if (!post.isOpen() || post.getEffectiveExpirationDate().isBefore(LocalDate.now())) {
                job.finished = true;
                return null;
            }
            // Only accounts explicitly marked by demo_posts are eligible as automated actors.
            List<Long> actors = em.createQuery("select distinct p.writer.id from DemoPost d, Post p where d.postId=p.id and p.writer.id<>:owner order by p.writer.id", Long.class)
                    .setParameter("owner", job.writerId).setMaxResults(100).getResultList();
            for (Long actorId : actors) {
                User actor = em.find(User.class, actorId);
                if (actor == null || !actor.isAvailable()) continue;
                long blocked = em.createQuery("select count(b) from UserBlock b where (b.blocker.id=:actor and b.blockedUser.id=:owner) or (b.blockedUser.id=:actor and b.blocker.id=:owner)", Long.class)
                        .setParameter("actor", actorId).setParameter("owner", job.writerId).getSingleResult();
                if (blocked > 0) continue;
                job.requestId = trades.createRequest(postId, actorId).requestId();
                job.dueAt = LocalDateTime.now().plusSeconds(2);
                return null;
            }
            job.attempts++;
            if (job.attempts >= 3) job.finished = true;
            else job.dueAt = LocalDateTime.now().plusSeconds(30);
            return null;
        }

        TradeRequest request = em.find(TradeRequest.class, job.requestId);
        if (request == null || request.getStatus() == TradeRequestStatus.CANCELLED
                || request.getStatus() == TradeRequestStatus.REJECTED) {
            job.finished = true;
            return null;
        }
        if (request.getStatus() == TradeRequestStatus.PENDING) {
            job.dueAt = LocalDateTime.now().plusSeconds(2);
            return null;
        }
        if (request.getStatus() == TradeRequestStatus.ACCEPTED && request.getWriterConfirmedAt() != null
                && request.getRequesterConfirmedAt() == null) {
            trades.complete(job.requestId, request.getRequester().getId());
            job.dueAt = LocalDateTime.now().plusSeconds(1);
            return null;
        }
        if (request.getStatus() == TradeRequestStatus.COMPLETED) {
            Long actor = request.getRequester().getId();
            long existing = em.createQuery("select count(v) from Review v where v.tradeRequest.id=:id and v.reviewer.id=:actor", Long.class)
                    .setParameter("id", job.requestId).setParameter("actor", actor).getSingleResult();
            if (existing > 0) {
                job.finished = true;
                return null;
            }
            Long room = chats.findRoomIdByTradeRequestId(request.getId());
            job.dueAt = LocalDateTime.now().plusSeconds(30);
            return new Prompt(job.postId, job.requestId, 0L,
                    DemoReviewContext.from(em, request, room, actor), null, false, null, true, null);
        }
        if (request.getStatus() != TradeRequestStatus.ACCEPTED) {
            job.finished = true;
            return null;
        }
        Long roomId = chats.findRoomIdByTradeRequestId(request.getId());
        if (roomId == null) {
            job.dueAt = LocalDateTime.now().plusSeconds(2);
            return null;
        }
        if (job.acceptedAt == null) {
            job.acceptedAt = LocalDateTime.now();
            job.dueAt = job.acceptedAt.plusSeconds(10);
            return null;
        }
        if (!job.greeted) {
            // Prepare the greeting under a lock, but never wait for OpenAI within a DB transaction.
            // A bounded lease prevents overlapping preparation across workers.
            job.dueAt = LocalDateTime.now().plusSeconds(25);
            return new Prompt(job.postId, job.requestId, 0L, greetingContext(post),
                    post.getImageUrl(), true, greeting(post), false, null);
        }
        List<ChatMessage> history = em.createQuery(
                "select m from ChatMessage m left join fetch m.sender where m.chatRoom.id=:room and m.systemMessage=false and m.sender.id in :people order by m.id desc",
                ChatMessage.class).setParameter("room", roomId)
                .setParameter("people", List.of(job.writerId,request.getRequester().getId())).setMaxResults(16).getResultList();
        long latest = history.stream().filter(m -> m.getSender() != null
                && m.getSender().getId().equals(job.writerId)).mapToLong(ChatMessage::getId).max().orElse(0);
        if (latest <= job.repliedThrough) {
            job.dueAt = LocalDateTime.now().plusSeconds(2);
            return null;
        }
        if (job.replyCount >= 30) {
            send(request, roomId, "네, 확인했습니다! 남은 내용은 거래 내역에서 확인해주세요.", "inbound-limit-" + latest);
            job.repliedThrough = latest;
            job.dueAt = LocalDateTime.now().plusSeconds(30);
            return null;
        }
        job.dueAt = LocalDateTime.now().plusSeconds(3);
        StringBuilder text = new StringBuilder("역할: 당신은 거래를 요청한 이웃입니다. 게시글 작성자에게 답장하세요.\n");
        text.append("유형: ").append(post.getPostType()).append(". ");
        if (post.getPostType() == PostType.BUY)
            text.append("작성자가 물품을 구하므로, 요청자는 판매/제공할 수 있는 쪽입니다.\n");
        else if (post.getPostType() == PostType.GROUP_BUY)
            text.append("작성자는 공동구매 주최자이며, 당신은 함께 구매하는 참가자입니다.\n");
        else text.append("작성자가 나눔 또는 판매하므로, 요청자는 받고 싶거나 구매하려는 쪽입니다.\n");
        text.append("게시글: ").append(post.getTitle()).append(" / 수량: ").append(post.getQuantity())
                .append(" / 가격: ").append(post.getPrice()).append(" / 장소: ").append(post.getTradeLocation())
                .append("\n최근 대화:\n");
        List<ChatMessage> ordered = new ArrayList<>(history);
        java.util.Collections.reverse(ordered);
        for (ChatMessage msg : ordered)
            text.append(msg.getSender().getId().equals(job.writerId) ? "게시글 작성자: " : "거래 요청자: ")
                    .append(msg.getContent()).append('\n');
        return new Prompt(job.postId, job.requestId, latest, text.toString(), null, false, null, false,
                DemoMeetupService.nearHuman(post.getWriter(), post));
    }

    public void respond(Prompt prompt) {
        if (prompt.review()) {
            var draft = ai.review(prompt.conversation());
            if (draft == null) draft = new DemoChatAi.ReviewDraft(5, "대화가 편안하게 진행돼서 좋았어요. 감사합니다!");
            final var review = draft;
            tx.executeWithoutResult(status -> {
                if (!demo.enabled()) return;
                DemoInboundJob job = em.find(DemoInboundJob.class, prompt.postId(), LockModeType.PESSIMISTIC_WRITE);
                if (job == null || job.finished || !prompt.requestId().equals(job.requestId)
                        || !safety.canParticipate(job.writerId)) return;
                TradeRequest request = em.find(TradeRequest.class, job.requestId);
                if (request == null || request.getStatus() != TradeRequestStatus.COMPLETED) return;
                Long actor = request.getRequester().getId();
                long exists = em.createQuery("select count(v) from Review v where v.tradeRequest.id=:id and v.reviewer.id=:actor", Long.class)
                        .setParameter("id", job.requestId).setParameter("actor", actor).getSingleResult();
                if (exists == 0) reviews.createReview(job.requestId, actor,
                        new ReviewCreateRequest(review.rating(), review.content()));
                job.finished = true;
            });
            return;
        }
        String meetupAnswer = prompt.greeting() ? null : meetup.suggest(prompt.conversation(), prompt.point());
        String answer = prompt.greeting()
                ? ai.firstMessage(prompt.conversation(), prompt.imageUrl(), prompt.fallback())
                : meetupAnswer != null ? meetupAnswer : ai.reply(prompt.conversation());
        if (answer == null || answer.isBlank())
            answer = prompt.greeting() ? prompt.fallback() : "네, 좋아요! 편하신 쪽으로 정해요.";
        final String message = answer;
        tx.executeWithoutResult(status -> {
            if (!demo.enabled()) return;
            DemoInboundJob job = em.find(DemoInboundJob.class, prompt.postId(), LockModeType.PESSIMISTIC_WRITE);
            if (job == null || job.finished || !prompt.requestId().equals(job.requestId)
                        || !safety.canParticipate(job.writerId)) return;
            if (prompt.greeting() ? job.greeted : (!job.greeted || job.repliedThrough >= prompt.through()))
                return;
            TradeRequest request = em.find(TradeRequest.class, job.requestId);
            if (request == null || request.getStatus() != TradeRequestStatus.ACCEPTED) return;
            Long room = chats.findRoomIdByTradeRequestId(job.requestId);
            if (room == null) return;
            send(request, room, message, prompt.greeting()
                    ? "inbound-greeting-" + prompt.postId()
                    : "inbound-reply-" + prompt.through());
            if (prompt.greeting()) job.greeted = true;
            else {
                job.repliedThrough = prompt.through();
                job.replyCount++;
            }
            job.dueAt = LocalDateTime.now().plusSeconds(2);
        });
    }

    private void send(TradeRequest trade, Long room, String content, String clientId) {
        Long sender = trade.getRequester().getId();
        var saved = chats.sendAutomatedMessage(sender, room, content, clientId);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { websocket.publishSavedMessage(sender, saved); }
        });
    }

    private String greetingContext(Post post) {
        String role = switch (post.getPostType()) {
            case SHARE -> "작성자가 나눔하는 물건을 받고 싶은 이웃";
            case SALE -> "작성자가 판매하는 물건을 구매하고 싶은 이웃";
            case BUY -> "작성자가 찾는 물품을 제공할 가능성이 있는 이웃";
            case GROUP_BUY -> "작성자가 주최한 공동구매에 참여한 이웃";
            default -> "게시글을 보고 연락하는 이웃";
        };
        return "역할: " + role
                + "\n게시글 유형: " + post.getPostType()
                + "\n품목: " + post.getIngredientName()
                + "\n제목: " + post.getTitle()
                + "\n게시글 상세 설명: " + post.getContent()
                + "\n수량: " + post.getQuantity()
                + "\n가격: " + post.getPrice()
                + "\n거래 장소: " + post.getTradeLocation()
                + "\n메시지는 제목을 그대로 반복하지 말고, 핵심 품목을 자연스럽게 짧게 불러주세요."
                + "\n사진이 첨부되면 참고하되 확인되지 않는 사실을 만들지 마세요.";
    }

    private String greeting(Post post) {
        String item = post.getIngredientName();
        if (item == null || item.isBlank()) item = "올리신 물건";
        item = item.strip();
        if (item.length() > 24) item = item.substring(0, 24);
        return switch (post.getPostType()) {
            case SHARE -> "안녕하세요! " + item + " 아직 나눔 가능할까요? 받고 싶어서요.";
            case SALE -> "안녕하세요! " + item + " 아직 판매 중일까요? 구매하고 싶어요.";
            case BUY -> "안녕하세요! " + item + " 구하신다는 글 보고 왔는데, 아직 찾고 계신가요?";
            case GROUP_BUY -> "안녕하세요! " + item + " 공동구매에 참여했어요. 수령 일정은 어떻게 될까요?";
            default -> "안녕하세요! 게시글 보고 연락드렸어요.";
        };
    }
}
