package com.hjs.foodshare.chat.dto;

import com.hjs.foodshare.chat.domain.ChatMessage;
import com.hjs.foodshare.chat.domain.ChatRoom;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.user.domain.User;
import java.time.LocalDateTime;
import java.util.List;

public record ChatRoomResponse(
        Long chatRoomId,
        Long tradeRequestId,
        Long postId,
        String postTitle,
        PostType postType,
        String roomName,
        Long partnerId,
        String partnerNickname,
        String partnerProfileImage,
        boolean groupRoom,
        int participantCount,
        List<ChatParticipantResponse> participants,
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
                room.isMutedFor(currentUserId), room.isGroupRoom(), 2, List.of(
                        ChatParticipantResponse.from(room.getWriter()),
                        ChatParticipantResponse.from(room.getRequester())
                ));
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
            int participantCount,
            List<ChatParticipantResponse> participants
    ) {
        String defaultRoomName = groupRoom
                ? room.getTradeRequest().getPost().getTitle() + " 공동구매방"
                : partner.getNickname();
        String roomName = room.getCustomName() == null || room.getCustomName().isBlank()
                ? defaultRoomName
                : room.getCustomName();

        return new ChatRoomResponse(
                room.getId(),
                room.getTradeRequest().getId(),
                room.getTradeRequest().getPost().getId(),
                room.getTradeRequest().getPost().getTitle(),
                room.getTradeRequest().getPost().getPostType(),
                roomName,
                partner.getId(),
                roomName,
                partner.getProfileImage(),
                groupRoom,
                participantCount,
                participants,
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
