package com.hjs.foodshare.favorite.repository;

import com.hjs.foodshare.favorite.domain.Favorite;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    Optional<Favorite> findByPostIdAndUserId(Long postId, Long userId);

    boolean existsByPostIdAndUserId(Long postId, Long userId);

    long countByPostId(Long postId);

    long countByUserId(Long userId);

    @Query("""
            select count(f)
            from Favorite f
            where f.post.writer.id = :writerId
            """)
    long countReceivedFavoritesByWriterId(@Param("writerId") Long writerId);

    List<Favorite> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    void deleteByPostIdAndUserId(Long postId, Long userId);
}
