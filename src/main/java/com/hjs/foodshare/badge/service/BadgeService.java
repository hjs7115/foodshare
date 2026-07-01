package com.hjs.foodshare.badge.service;

import com.hjs.foodshare.badge.dto.BadgeResponse;
import com.hjs.foodshare.badge.dto.BadgeSummaryResponse;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.review.repository.ReviewRepository;
import com.hjs.foodshare.trade.domain.TradeRequestStatus;
import com.hjs.foodshare.trade.repository.TradeRequestRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class BadgeService {

    private final PostRepository postRepository;
    private final TradeRequestRepository tradeRequestRepository;
    private final ReviewRepository reviewRepository;

    public BadgeService(PostRepository postRepository, TradeRequestRepository tradeRequestRepository,
                        ReviewRepository reviewRepository) {
        this.postRepository = postRepository;
        this.tradeRequestRepository = tradeRequestRepository;
        this.reviewRepository = reviewRepository;
    }

    public BadgeSummaryResponse getMyBadges(Long userId) {
        int postCount = toInt(postRepository.countByWriterIdAndDeletedFalse(userId));
        int sharePostCount = toInt(postRepository.countByWriterIdAndPostTypeAndDeletedFalse(userId, PostType.SHARE));
        int groupBuyPostCount = toInt(postRepository.countByWriterIdAndPostTypeAndDeletedFalse(userId, PostType.GROUP_BUY));
        int completedTradeCount = toInt(tradeRequestRepository.countCompletedTradesForUser(
                userId,
                TradeRequestStatus.COMPLETED
        ));
        int receivedReviewCount = toInt(reviewRepository.countByTargetUserId(userId));
        int ratingScore = (int) Math.round(reviewRepository.averageRatingByTargetUserId(userId) * 10);

        List<BadgeResponse> badges = List.of(
                BadgeResponse.of("FIRST_POST", "첫 게시글", "게시글을 1개 이상 작성하면 획득합니다.", postCount, 1),
                BadgeResponse.of("SHARING_STARTER", "나눔 시작", "나눔 게시글을 1개 이상 작성하면 획득합니다.", sharePostCount, 1),
                BadgeResponse.of("GROUP_BUY_HOST", "공동구매 호스트", "공동구매 게시글을 1개 이상 작성하면 획득합니다.", groupBuyPostCount, 1),
                BadgeResponse.of("TRADE_FINISHER", "거래 완료", "거래를 1회 이상 완료하면 획득합니다.", completedTradeCount, 1),
                BadgeResponse.of("GOOD_NEIGHBOR", "좋은 이웃", "받은 리뷰가 3개 이상이면 획득합니다.", receivedReviewCount, 3),
                BadgeResponse.of("TOP_RATED", "높은 평점", "평균 평점 4.5점 이상이면 획득합니다.", ratingScore, 45)
        );
        return BadgeSummaryResponse.from(badges);
    }

    private int toInt(long value) {
        return value > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) value;
    }
}
