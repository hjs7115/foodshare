package com.hjs.foodshare.badge.service;

import com.hjs.foodshare.badge.dto.BadgeResponse;
import com.hjs.foodshare.badge.dto.BadgeSummaryResponse;
import com.hjs.foodshare.comment.repository.CommentRepository;
import com.hjs.foodshare.favorite.repository.FavoriteRepository;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.review.repository.ReviewRepository;
import com.hjs.foodshare.trade.domain.TradeRequestStatus;
import com.hjs.foodshare.trade.repository.TradeRequestRepository;
import com.hjs.foodshare.user.repository.UserRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class BadgeService {

    private final PostRepository postRepository;
    private final TradeRequestRepository tradeRequestRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final FavoriteRepository favoriteRepository;

    public BadgeService(PostRepository postRepository, TradeRequestRepository tradeRequestRepository,
                        ReviewRepository reviewRepository, UserRepository userRepository,
                        CommentRepository commentRepository, FavoriteRepository favoriteRepository) {
        this.postRepository = postRepository;
        this.tradeRequestRepository = tradeRequestRepository;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.commentRepository = commentRepository;
        this.favoriteRepository = favoriteRepository;
    }

    public BadgeSummaryResponse getMyBadges(Long userId) {
        int postCount = toInt(postRepository.countByWriterIdAndDeletedFalse(userId));
        int sharePostCount = toInt(postRepository.countByWriterIdAndPostTypeAndDeletedFalse(userId, PostType.SHARE));
        int salePostCount = toInt(postRepository.countByWriterIdAndPostTypeAndDeletedFalse(userId, PostType.SALE));
        int groupBuyPostCount = toInt(postRepository.countByWriterIdAndPostTypeAndDeletedFalse(userId, PostType.GROUP_BUY));
        int completedTradeCount = toInt(tradeRequestRepository.countCompletedTradesForUser(
                userId,
                TradeRequestStatus.COMPLETED
        ));
        int receivedReviewCount = toInt(reviewRepository.countByTargetUserId(userId));
        int positiveReviewCount = toInt(reviewRepository.countByTargetUserIdAndRatingGreaterThanEqual(userId, 4));
        int lowReviewCount = toInt(reviewRepository.countByTargetUserIdAndRatingLessThanEqual(userId, 2));
        int ratingScore = (int) Math.round(reviewRepository.averageRatingByTargetUserId(userId) * 10);
        int freshnessScore = (int) Math.round(userRepository.findById(userId)
                .map(user -> user.getFreshnessScore())
                .orElse(50.0));
        int commentCount = toInt(commentRepository.countByWriterId(userId));
        int favoriteCount = toInt(favoriteRepository.countByUserId(userId));
        int receivedFavoriteCount = toInt(favoriteRepository.countReceivedFavoritesByWriterId(userId));

        List<BadgeResponse> badges = List.of(
                BadgeResponse.of("FIRST_POST", "첫 게시글", "게시글을 처음 작성하면 획득합니다.", postCount, 1),
                BadgeResponse.of("POST_EXPLORER", "게시 탐험가", "게시글을 5개 이상 작성하면 획득합니다.", postCount, 5),
                BadgeResponse.of("ACTIVE_POSTER", "활동 반띵러", "게시글을 10개 이상 작성하면 획득합니다.", postCount, 10),
                BadgeResponse.of("POST_MASTER", "게시 장인", "게시글을 30개 이상 작성하면 획득합니다.", postCount, 30),

                BadgeResponse.of("SHARING_STARTER", "나눔 시작", "나눔 게시글을 1개 이상 작성하면 획득합니다.", sharePostCount, 1),
                BadgeResponse.of("SHARING_KEEPER", "나눔 지킴이", "나눔 게시글을 5개 이상 작성하면 획득합니다.", sharePostCount, 5),
                BadgeResponse.of("SHARING_HERO", "나눔 장인", "나눔 게시글을 10개 이상 작성하면 획득합니다.", sharePostCount, 10),

                BadgeResponse.of("SALE_STARTER", "판매 시작", "판매 게시글을 1개 이상 작성하면 획득합니다.", salePostCount, 1),
                BadgeResponse.of("SALE_REGULAR", "알뜰 판매러", "판매 게시글을 5개 이상 작성하면 획득합니다.", salePostCount, 5),

                BadgeResponse.of("GROUP_BUY_HOST", "공동구매 호스트", "공동구매 게시글을 1개 이상 작성하면 획득합니다.", groupBuyPostCount, 1),
                BadgeResponse.of("GROUP_BUY_LEADER", "공동구매 리더", "공동구매 게시글을 5개 이상 작성하면 획득합니다.", groupBuyPostCount, 5),

                BadgeResponse.of("TRADE_FINISHER", "첫 거래 완료", "거래를 1회 이상 완료하면 획득합니다.", completedTradeCount, 1),
                BadgeResponse.of("TRADE_FRIEND", "거래 친구", "거래를 5회 이상 완료하면 획득합니다.", completedTradeCount, 5),
                BadgeResponse.of("TRADE_REGULAR", "단골 반띵러", "거래를 10회 이상 완료하면 획득합니다.", completedTradeCount, 10),
                BadgeResponse.of("TRADE_EXPERT", "거래 고수", "거래를 30회 이상 완료하면 획득합니다.", completedTradeCount, 30),
                BadgeResponse.of("TRADE_MASTER", "거래 마스터", "거래를 50회 이상 완료하면 획득합니다.", completedTradeCount, 50),

                BadgeResponse.of("FIRST_REVIEW", "첫 칭찬", "리뷰를 1개 이상 받으면 획득합니다.", receivedReviewCount, 1),
                BadgeResponse.of("GOOD_NEIGHBOR", "좋은 이웃", "받은 리뷰가 3개 이상이면 획득합니다.", receivedReviewCount, 3),
                BadgeResponse.of("TRUSTED_REVIEW", "검증된 이웃", "받은 리뷰가 10개 이상이면 획득합니다.", receivedReviewCount, 10),
                BadgeResponse.of("REVIEW_STAR", "리뷰 스타", "받은 리뷰가 20개 이상이면 획득합니다.", receivedReviewCount, 20),

                BadgeResponse.of("KIND_NEIGHBOR", "친절한 이웃", "4점 이상 리뷰를 5개 이상 받으면 획득합니다.", positiveReviewCount, 5),
                BadgeResponse.of("MANNER_PRO", "매너 우수", "4점 이상 리뷰를 10개 이상 받으면 획득합니다.", positiveReviewCount, 10),
                BadgeResponse.of("TOP_RATED", "높은 평점", "평균 평점 4.5점 이상이면 획득합니다.", ratingScore, 45),
                BadgeResponse.of("PERFECT_MANNER", "완벽 매너", "평균 평점 4.8점 이상이면 획득합니다.", ratingScore, 48),

                BadgeResponse.of("FRESH_START", "성장 반띵러", "신선도 55% 이상이면 획득합니다.", freshnessScore, 55),
                BadgeResponse.of("FRESH_TRUST", "든든한 반띵러", "신선도 70% 이상이면 획득합니다.", freshnessScore, 70),
                BadgeResponse.of("FRESH_MODEL", "모범 반띵러", "신선도 85% 이상이면 획득합니다.", freshnessScore, 85),
                BadgeResponse.of("FRESH_LEGEND", "전설 반띵러", "신선도 95% 이상이면 획득합니다.", freshnessScore, 95),

                BadgeResponse.of("COMMENT_STARTER", "첫 댓글", "댓글을 1개 이상 작성하면 획득합니다.", commentCount, 1),
                BadgeResponse.of("COMMUNITY_HELPER", "소통 도우미", "댓글을 10개 이상 작성하면 획득합니다.", commentCount, 10),

                BadgeResponse.of("FAVORITE_STARTER", "관심 시작", "관심 게시글을 1개 이상 등록하면 획득합니다.", favoriteCount, 1),
                BadgeResponse.of("FAVORITE_COLLECTOR", "관심 수집가", "관심 게시글을 10개 이상 등록하면 획득합니다.", favoriteCount, 10),
                BadgeResponse.of("POPULAR_POST", "인기 게시글", "내 게시글이 관심을 1개 이상 받으면 획득합니다.", receivedFavoriteCount, 1),
                BadgeResponse.of("HOT_POST_OWNER", "인기 반띵러", "내 게시글이 관심을 10개 이상 받으면 획득합니다.", receivedFavoriteCount, 10),

                BadgeResponse.of("LOW_RISK_KEEPER", "매너 관리 중", "낮은 평점 리뷰가 0개이면 획득합니다.", lowReviewCount == 0 ? 1 : 0, 1)
        );
        return BadgeSummaryResponse.from(badges);
    }

    private int toInt(long value) {
        return value > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) value;
    }
}
