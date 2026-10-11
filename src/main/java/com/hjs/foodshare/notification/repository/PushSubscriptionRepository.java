package com.hjs.foodshare.notification.repository;

import com.hjs.foodshare.notification.domain.PushSubscription;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
    List<PushSubscription> findAllByUser_Id(Long userId);

    Optional<PushSubscription> findByEndpoint(String endpoint);

    void deleteByEndpointAndUser_Id(String endpoint, Long userId);
}
