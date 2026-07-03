package com.hjs.foodshare.fridge.dto;

import com.hjs.foodshare.fridge.domain.FridgeItem;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

public record FridgeItemResponse(
        Long id,
        String name,
        String amount,
        LocalDate expiryDate,
        String storagePlace,
        String memo,
        long daysLeft,
        boolean expired,
        boolean expiringSoon,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static FridgeItemResponse from(FridgeItem item) {
        long daysLeft = ChronoUnit.DAYS.between(LocalDate.now(), item.getExpiryDate());
        return new FridgeItemResponse(
                item.getId(),
                item.getName(),
                item.getAmount(),
                item.getExpiryDate(),
                item.getStoragePlace(),
                item.getMemo(),
                daysLeft,
                daysLeft < 0,
                daysLeft >= 0 && daysLeft <= 3,
                item.getCreatedAt(),
                item.getUpdatedAt()
        );
    }
}
