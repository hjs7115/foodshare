package com.hjs.foodshare.notification.repository;

import com.hjs.foodshare.notification.domain.Notification;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    List<Notification> findAllByUserIdAndReadTrue(Long userId);

    long countByUserIdAndReadFalse(Long userId);

    boolean existsByUserIdAndTypeAndMessage(Long userId, String type, String message);
}
