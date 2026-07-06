package com.hjs.foodshare.chat.dto;

import com.hjs.foodshare.chat.domain.ChatMessage;
import java.time.LocalDateTime;

public record ChatMessageResponse(
        Long messageId,
        Long chatRoomId,
        Long senderId,
        String senderNickname,
        String senderProfileImage,
        String content,
        boolean systemMessage,
        boolean mine,
        boolean unreadByPartner,
        LocalDateTime createdAt
) {
    public static ChatMessageResponse from(ChatMessage message, Long currentUserId) {
        return from(message, currentUserId, false);
    }

    public static ChatMessageResponse from(ChatMessage message, Long currentUserId, boolean unreadByPartner) {
        Long senderId = message.getSender() == null ? null : message.getSender().getId();
        return new ChatMessageResponse(
                message.getId(),
                message.getChatRoom().getId(),
                senderId,
                message.getSender() == null ? null : message.getSender().getNickname(),
                message.getSender() == null ? null : message.getSender().getProfileImage(),
                message.getContent(),
                message.isSystemMessage(),
                senderId != null && senderId.equals(currentUserId),
                unreadByPartner,
                message.getCreatedAt()
        );
    }
}
