package com.hjs.foodshare.review.repository;

import com.hjs.foodshare.review.domain.Review;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    boolean existsByTradeRequestIdAndReviewerId(Long tradeRequestId, Long reviewerId);

    List<Review> findAllByTargetUserIdOrderByCreatedAtDesc(Long targetUserId);

    List<Review> findAllByReviewerIdOrderByCreatedAtDesc(Long reviewerId);

    org.springframework.data.domain.Page<Review> findAllByTargetUserIdOrderByCreatedAtDesc(Long userId,org.springframework.data.domain.Pageable page);
    org.springframework.data.domain.Page<Review> findAllByReviewerIdOrderByCreatedAtDesc(Long userId,org.springframework.data.domain.Pageable page);
    long countByTargetUserId(Long targetUserId);

    long countByTargetUserIdAndRating(Long id,Integer rating);
    long countByTargetUserIdAndRatingGreaterThanEqual(Long targetUserId, Integer rating);

    long countByTargetUserIdAndRatingLessThanEqual(Long targetUserId, Integer rating);

    @Query("select coalesce(avg(r.rating), 0.0) from Review r where r.targetUser.id = :targetUserId")
    double averageRatingByTargetUserId(@Param("targetUserId") Long targetUserId);
}
