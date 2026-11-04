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
        LocalDateTime createdAt,
        int unreadCount,
        String clientMessageId
) {
    public ChatMessageResponse(Long messageId,Long chatRoomId,Long senderId,String senderNickname,String senderProfileImage,String content,boolean systemMessage,boolean mine,boolean unreadByPartner,LocalDateTime createdAt) {
        this(messageId,chatRoomId,senderId,senderNickname,senderProfileImage,content,systemMessage,mine,unreadByPartner,createdAt,unreadByPartner?1:0,null);
    }
    public ChatMessageResponse withUnreadCount(int count) {
        return new ChatMessageResponse(messageId,chatRoomId,senderId,senderNickname,senderProfileImage,content,systemMessage,mine,count>0,createdAt,count,clientMessageId);
    }
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
                message.getCreatedAt(), unreadByPartner?1:0, message.getClientMessageId()
        );
    }
}
