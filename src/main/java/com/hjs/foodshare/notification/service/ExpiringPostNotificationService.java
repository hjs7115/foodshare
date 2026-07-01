package com.hjs.foodshare.notification.service;

import com.hjs.foodshare.notification.repository.NotificationRepository;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.post.domain.PostStatus;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.post.repository.PostRepository;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpiringPostNotificationService {

    private static final String EXPIRING_SOON_TYPE = "EXPIRING_SOON";

    private final PostRepository postRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;

    public ExpiringPostNotificationService(
            PostRepository postRepository,
            NotificationRepository notificationRepository,
            NotificationService notificationService
    ) {
        this.postRepository = postRepository;
        this.notificationRepository = notificationRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(cron = "0 0 9 * * *", zone = "Asia/Seoul")
    @Transactional
    public void notifyExpiringPosts() {
        LocalDate today = LocalDate.now();
        closeExpiredGroupBuys(today);

        postRepository.findAllByDeletedFalseAndStatusAndExpirationDateBetween(
                        PostStatus.OPEN,
                        today,
                        today.plusDays(3)
                )
                .forEach(this::notifyExpiringPostOnce);
    }

    private void closeExpiredGroupBuys(LocalDate today) {
        postRepository.findAllByDeletedFalseAndStatusAndDeadlineDateBefore(PostStatus.OPEN, today)
                .stream()
                .filter(post -> post.getPostType() == PostType.GROUP_BUY)
                .forEach(Post::close);
    }

    private void notifyExpiringPostOnce(Post post) {
        if (!post.getWriter().isNotificationNewPost()) {
            return;
        }

        long days = ChronoUnit.DAYS.between(LocalDate.now(), post.getExpirationDate());
        String title = "유통기한 임박";
        String message = "'%s' 게시글의 유통기한이 %s.".formatted(post.getTitle(), toExpirationText(days));

        if (notificationRepository.existsByUserIdAndTypeAndMessage(
                post.getWriter().getId(),
                EXPIRING_SOON_TYPE,
                message
        )) {
            return;
        }

        notificationService.createNotification(post.getWriter().getId(), EXPIRING_SOON_TYPE, title, message,
                "POST", post.getId());
    }

    private String toExpirationText(long days) {
        if (days == 0) {
            return "오늘까지입니다";
        }
        return days + "일 남았습니다";
    }
}
