package com.hjs.foodshare.trade.repository;

import com.hjs.foodshare.trade.domain.TradeRequest;
import com.hjs.foodshare.trade.domain.TradeRequestStatus;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TradeRequestRepository extends JpaRepository<TradeRequest, Long> {

    boolean existsByPostIdAndRequesterId(Long postId, Long requesterId);

    List<TradeRequest> findAllByRequesterIdOrderByCreatedAtDesc(Long requesterId);

    List<TradeRequest> findAllByPostIdOrderByCreatedAtDesc(Long postId);

    List<TradeRequest> findAllByPostWriterIdOrderByCreatedAtDesc(Long writerId);

    @Query("""
            select tr
            from TradeRequest tr
            where tr.status = :status
              and (
                    (tr.post.writer.id = :reviewerId and tr.requester.id = :targetUserId)
                 or (tr.post.writer.id = :targetUserId and tr.requester.id = :reviewerId)
              )
            order by tr.completedAt desc
            """)
    List<TradeRequest> findCompletedTradesBetweenUsers(
            @Param("reviewerId") Long reviewerId,
            @Param("targetUserId") Long targetUserId,
            @Param("status") TradeRequestStatus status,
            Pageable pageable
    );
}
