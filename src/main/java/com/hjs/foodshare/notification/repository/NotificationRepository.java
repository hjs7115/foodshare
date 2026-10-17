package com.hjs.foodshare.notification.repository;

import com.hjs.foodshare.notification.domain.Notification;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    List<Notification> findAllByUserIdAndReadTrue(Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("delete from Notification n where n.user.id=:userId")
    int deleteAllOwned(@org.springframework.data.repository.query.Param("userId") Long userId);

    long countByUserIdAndReadFalse(Long userId);

    boolean existsByUserIdAndTypeAndMessage(Long userId, String type, String message);
}
