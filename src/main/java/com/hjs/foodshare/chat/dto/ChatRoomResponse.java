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
        boolean groupRoom,
        int participantCount,
        String lastMessage,
        LocalDateTime lastMessageAt,
        int unreadCount,
        boolean pinned,
        boolean muted,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ChatRoomResponse from(ChatRoom room, Long currentUserId, ChatMessage lastMessage) {
        User partner = room.getWriter().getId().equals(currentUserId) ? room.getRequester() : room.getWriter();
        int unreadCount = room.getWriter().getId().equals(currentUserId)
                ? room.getWriterUnreadCount()
                : room.getRequesterUnreadCount();
        return from(room, currentUserId, lastMessage, partner, unreadCount, room.isPinnedFor(currentUserId),
                room.isMutedFor(currentUserId), room.isGroupRoom(), 2);
    }

    public static ChatRoomResponse from(
            ChatRoom room,
            Long currentUserId,
            ChatMessage lastMessage,
            User partner,
            int unreadCount,
            boolean pinned,
            boolean muted,
            boolean groupRoom,
            int participantCount
    ) {
        String partnerNickname = groupRoom
                ? room.getTradeRequest().getPost().getTitle() + " 공동구매방"
                : partner.getNickname();

        return new ChatRoomResponse(
                room.getId(),
                room.getTradeRequest().getId(),
                room.getTradeRequest().getPost().getId(),
                room.getTradeRequest().getPost().getTitle(),
                room.getTradeRequest().getPost().getPostType(),
                partner.getId(),
                partnerNickname,
                partner.getProfileImage(),
                groupRoom,
                participantCount,
                lastMessage == null ? null : lastMessage.getContent(),
                lastMessage == null ? null : lastMessage.getCreatedAt(),
                unreadCount,
                pinned,
                muted,
                room.getCreatedAt(),
                room.getUpdatedAt()
        );
    }
}
