package com.hjs.foodshare.favorite.repository;

import com.hjs.foodshare.favorite.domain.Favorite;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    Optional<Favorite> findByPostIdAndUserId(Long postId, Long userId);

    boolean existsByPostIdAndUserId(Long postId, Long userId);

    long countByPostId(Long postId);

    List<Favorite> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    void deleteByPostIdAndUserId(Long postId, Long userId);
}
