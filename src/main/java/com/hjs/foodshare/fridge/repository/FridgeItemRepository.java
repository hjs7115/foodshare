package com.hjs.foodshare.fridge.repository;

import com.hjs.foodshare.fridge.domain.FridgeItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FridgeItemRepository extends JpaRepository<FridgeItem, Long> {

    List<FridgeItem> findAllByUserIdOrderByExpiryDateAscCreatedAtAsc(Long userId);

    Optional<FridgeItem> findByIdAndUserId(Long id, Long userId);
}
