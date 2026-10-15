package com.hjs.foodshare.fridge.repository;

import com.hjs.foodshare.fridge.domain.FridgeItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FridgeItemRepository extends JpaRepository<FridgeItem, Long> {

    Optional<FridgeItem> findBySharedPostId(Long postId);

    List<FridgeItem> findAllByUserIdOrderByExpiryDateAscCreatedAtAsc(Long userId);

    Optional<FridgeItem> findByIdAndUserId(Long id, Long userId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select f from FridgeItem f where f.id = :id and f.user.id = :userId")
    Optional<FridgeItem> lockOwned(@org.springframework.data.repository.query.Param("id") Long id, @org.springframework.data.repository.query.Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Query("select f from FridgeItem f join fetch f.user join fetch f.sharedPost where f.shareConfirmedAt >= :since and f.expiryDate >= :today and f.user.latitude between :minLat and :maxLat and f.user.longitude between :minLng and :maxLng order by f.shareConfirmedAt desc")
    List<FridgeItem> findNearbyCandidates(@org.springframework.data.repository.query.Param("since") java.time.LocalDateTime since, @org.springframework.data.repository.query.Param("today") java.time.LocalDate today,
      @org.springframework.data.repository.query.Param("minLat") double minLat, @org.springframework.data.repository.query.Param("maxLat") double maxLat,
      @org.springframework.data.repository.query.Param("minLng") double minLng, @org.springframework.data.repository.query.Param("maxLng") double maxLng);
}
