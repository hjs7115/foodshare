package com.hjs.foodshare.chat.websocket;

public record WebSocketChatMessage(
        String type,
        Long roomId,
        String content
) {
}
