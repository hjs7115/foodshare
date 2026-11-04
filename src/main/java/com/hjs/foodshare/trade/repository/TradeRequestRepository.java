package com.hjs.foodshare.trade.repository;

import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.trade.domain.TradeRequest;
import com.hjs.foodshare.trade.domain.TradeRequestStatus;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TradeRequestRepository extends JpaRepository<TradeRequest, Long> {

    boolean existsByPostIdAndRequesterId(Long postId, Long requesterId);
    boolean existsByPostIdAndRequesterIdAndStatusIn(Long postId, Long requesterId, List<TradeRequestStatus> statuses);
    boolean existsByPostIdAndStatusIn(Long postId, List<TradeRequestStatus> statuses);

    List<TradeRequest> findAllByRequesterIdOrderByCreatedAtDesc(Long requesterId);

    List<TradeRequest> findAllByPostIdOrderByCreatedAtDesc(Long postId);

    List<TradeRequest> findAllByPostWriterIdOrderByCreatedAtDesc(Long writerId);

    List<TradeRequest> findAllByPostIdAndStatus(Long postId, TradeRequestStatus status);

    java.util.Optional<TradeRequest> findFirstByPostIdAndRequesterIdAndStatusInOrderByIdDesc(Long postId,Long userId,List<TradeRequestStatus> statuses);
    long countByPostWriterIdAndStatus(Long userId,TradeRequestStatus status);
    long countByRequesterId(Long userId);
    long countByPostWriterId(Long userId);

    @Query("select t from TradeRequest t join fetch t.post p join fetch p.writer join fetch t.requester where t.requester.id=:id and coalesce(t.requesterHistoryHidden,false)=false order by t.id desc")
    org.springframework.data.domain.Page<TradeRequest> sentPage(@Param("id") Long id,org.springframework.data.domain.Pageable page);
    @Query("select t from TradeRequest t join fetch t.post p join fetch p.writer join fetch t.requester where p.writer.id=:id and coalesce(t.writerHistoryHidden,false)=false order by t.id desc")
    org.springframework.data.domain.Page<TradeRequest> receivedPage(@Param("id") Long id,org.springframework.data.domain.Pageable page);
    long countByStatus(TradeRequestStatus status);

    @Query("""
            select count(tr)
            from TradeRequest tr
            where tr.post.writer.id = :userId
              and tr.post.postType = :postType
              and tr.status = :status
            """)
    long countByPostWriterIdAndPostTypeAndStatus(
            @Param("userId") Long userId,
            @Param("postType") PostType postType,
            @Param("status") TradeRequestStatus status
    );

    @Query("""
            select count(tr)
            from TradeRequest tr
            where tr.requester.id = :userId
              and tr.post.postType = :postType
              and tr.status = :status
            """)
    long countByRequesterIdAndPostTypeAndStatus(
            @Param("userId") Long userId,
            @Param("postType") PostType postType,
            @Param("status") TradeRequestStatus status
    );

    @Query("""
            select count(distinct tr.post.id)
            from TradeRequest tr
            where tr.post.postType = :postType
              and tr.status = :status
              and (tr.requester.id = :userId or tr.post.writer.id = :userId)
            """)
    long countDistinctPostsByRequesterOrWriterAndPostTypeAndStatus(
            @Param("userId") Long userId,
            @Param("postType") PostType postType,
            @Param("status") TradeRequestStatus status
    );

    @Query("""
            select count(tr)
            from TradeRequest tr
            where tr.status = :status
              and (tr.post.writer.id = :userId or tr.requester.id = :userId)
            """)
    long countCompletedTradesForUser(
            @Param("userId") Long userId,
            @Param("status") TradeRequestStatus status
    );

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
