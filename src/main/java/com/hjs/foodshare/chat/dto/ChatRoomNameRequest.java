package com.hjs.foodshare.chat.dto;

import jakarta.validation.constraints.Size;

public record ChatRoomNameRequest(
        @Size(max = 100, message = "roomName must be 100 characters or less.")
        String roomName
) {
}
