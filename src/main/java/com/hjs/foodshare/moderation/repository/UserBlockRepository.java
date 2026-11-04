package com.hjs.foodshare.moderation.repository;

import com.hjs.foodshare.moderation.domain.UserBlock;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserBlockRepository extends JpaRepository<UserBlock, Long> {

    default boolean blockedEitherWay(Long a, Long b) {
        return existsByBlockerIdAndBlockedUserId(a, b) || existsByBlockerIdAndBlockedUserId(b, a);
    }

    boolean existsByBlockerIdAndBlockedUserId(Long blockerId, Long blockedUserId);

    Optional<UserBlock> findByBlockerIdAndBlockedUserId(Long blockerId, Long blockedUserId);

    List<UserBlock> findAllByBlockerIdOrderByCreatedAtDesc(Long blockerId);
}
