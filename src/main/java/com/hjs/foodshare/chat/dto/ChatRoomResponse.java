package com.hjs.foodshare.chat.dto;

import com.hjs.foodshare.chat.domain.ChatMessage;
import com.hjs.foodshare.chat.domain.ChatRoom;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.user.domain.User;
import java.time.LocalDateTime;

public record ChatRoomResponse(
        Long chatRoomId,
        Long tradeRequestId,
        Long postId,
        String postTitle,
        PostType postType,
        Long partnerId,
        String partnerNickname,
        String partnerProfileImage,
        String lastMessage,
        LocalDateTime lastMessageAt,
        int unreadCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ChatRoomResponse from(ChatRoom room, Long currentUserId, ChatMessage lastMessage) {
        User partner = room.getWriter().getId().equals(currentUserId) ? room.getRequester() : room.getWriter();
        int unreadCount = room.getWriter().getId().equals(currentUserId)
                ? room.getWriterUnreadCount()
                : room.getRequesterUnreadCount();

        return new ChatRoomResponse(
                room.getId(),
                room.getTradeRequest().getId(),
                room.getTradeRequest().getPost().getId(),
                room.getTradeRequest().getPost().getTitle(),
                room.getTradeRequest().getPost().getPostType(),
                partner.getId(),
                partner.getNickname(),
                partner.getProfileImage(),
                lastMessage == null ? null : lastMessage.getContent(),
                lastMessage == null ? null : lastMessage.getCreatedAt(),
                unreadCount,
                room.getCreatedAt(),
                room.getUpdatedAt()
        );
    }
}
