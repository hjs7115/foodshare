package com.hjs.foodshare.trade.service;
import com.hjs.foodshare.post.repository.PostRepository;
import java.time.LocalDateTime;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
@Component
public class GroupBuyExpirationScheduler {
    private final PostRepository posts;
    private final TradeRequestService trades;
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(GroupBuyExpirationScheduler.class);
    public GroupBuyExpirationScheduler(PostRepository posts, TradeRequestService trades) { this.posts=posts; this.trades=trades; }
    @Scheduled(fixedDelay=60000, initialDelay=15000)
    public void expire() {
        for (Long id : posts.findExpiredGroupBuyIds(LocalDateTime.now())) {
            try { trades.expireGroupBuy(id); }
            catch (RuntimeException e) { log.warn("Group buy expiration failed for post {}", id, e); }
        }
    }
}
