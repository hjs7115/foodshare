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
        boolean readOnly,
        boolean pinned,
        boolean muted,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        boolean simulation
) {
    public ChatRoomResponse withRoomName(String name){
        return name==null||name.isBlank()?this:new ChatRoomResponse(chatRoomId,tradeRequestId,postId,postTitle,postType,name,partnerId,partnerNickname,partnerProfileImage,groupRoom,participantCount,participants,lastMessage,lastMessageAt,unreadCount,readOnly,pinned,muted,createdAt,updatedAt,simulation);
    }
    public ChatRoomResponse withSimulation(boolean enabled) {
        if (!enabled) return this;
        String naturalName = partnerNickname == null ? "이웃" : partnerNickname.replaceAll("(?i)(?:시연|데모)", "").trim();
        if (naturalName.isBlank()) naturalName = "이웃" + partnerId;
        String displayName = roomName != null && roomName.equals(partnerNickname) ? naturalName : roomName;
        return new ChatRoomResponse(chatRoomId,tradeRequestId,postId,postTitle,postType,displayName,partnerId,naturalName,partnerProfileImage,groupRoom,participantCount,participants,lastMessage,lastMessageAt,unreadCount,readOnly,pinned,muted,createdAt,updatedAt,true);
    }
    public static ChatRoomResponse from(ChatRoom room, Long currentUserId, ChatMessage lastMessage) {
        User partner = room.getWriter().getId().equals(currentUserId) ? room.getRequester() : room.getWriter();
        int unreadCount = room.getWriter().getId().equals(currentUserId)
                ? room.getWriterUnreadCount()
                : room.getRequesterUnreadCount();
        return from(room, currentUserId, lastMessage, partner, unreadCount, false, room.isPinnedFor(currentUserId),
                room.isMutedFor(currentUserId), room.isGroupRoom(), 2, List.of(
                        ChatParticipantResponse.from(room.getWriter()),
                        ChatParticipantResponse.from(room.getRequester())
                ), room.getUpdatedAt());
    }

    public static ChatRoomResponse from(
            ChatRoom room,
            Long currentUserId,
            ChatMessage lastMessage,
            User partner,
            int unreadCount,
            boolean readOnly,
            boolean pinned,
            boolean muted,
            boolean groupRoom,
            int participantCount,
            List<ChatParticipantResponse> participants,
            LocalDateTime updatedAt
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
                room.getTradeRequest().getExchangeDescription()==null?room.getTradeRequest().getPost().getTitle():room.getTradeRequest().getExchangeDescription(),
                room.getTradeRequest().getPost().getPostType(),
                roomName,
                partner.getId(),
                partner.getNickname(),
                partner.getProfileImage(),
                groupRoom,
                participantCount,
                participants,
                lastMessage == null ? null : lastMessage.getContent(),
                lastMessage == null ? null : lastMessage.getCreatedAt(),
                unreadCount,
                readOnly,
                pinned,
                muted,
                room.getCreatedAt(),
                updatedAt,
                false
        );
    }
}
