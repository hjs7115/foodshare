package com.hjs.foodshare.fridge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record FridgeItemRequest(
        @NotBlank(message = "name is required.")
        @Size(max = 100, message = "name must be 100 characters or less.")
        String name,

        @Size(max = 50, message = "amount must be 50 characters or less.")
        String amount,

        @NotNull(message = "expiryDate is required.")
        LocalDate expiryDate,

        @Size(max = 30, message = "storagePlace must be 30 characters or less.")
        String storagePlace,

        String memo
) {
    public String amountValue() {
        return amount == null || amount.isBlank() ? "수량 미정" : amount.trim();
    }

    public String storagePlaceValue() {
        return storagePlace == null || storagePlace.isBlank() ? "냉장" : storagePlace.trim();
    }

    public String memoValue() {
        return memo == null ? "" : memo.trim();
    }

    public String nameValue() {
        return name.trim();
    }
}
