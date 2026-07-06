package com.hjs.foodshare.chat.service;

import com.hjs.foodshare.chat.domain.ChatMessage;
import com.hjs.foodshare.chat.domain.ChatRoom;
import com.hjs.foodshare.chat.domain.ChatRoomMember;
import com.hjs.foodshare.chat.dto.ChatMessageRequest;
import com.hjs.foodshare.chat.dto.ChatMessageResponse;
import com.hjs.foodshare.chat.dto.ChatRoomResponse;
import com.hjs.foodshare.chat.repository.ChatMessageRepository;
import com.hjs.foodshare.chat.repository.ChatRoomMemberRepository;
import com.hjs.foodshare.chat.repository.ChatRoomRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.notification.service.NotificationService;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.trade.domain.TradeRequest;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public ChatService(
            ChatRoomRepository chatRoomRepository,
            ChatMessageRepository chatMessageRepository,
            ChatRoomMemberRepository chatRoomMemberRepository,
            UserRepository userRepository,
            NotificationService notificationService
    ) {
        this.chatRoomRepository = chatRoomRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.chatRoomMemberRepository = chatRoomMemberRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public ChatRoom openRoomForTradeRequest(TradeRequest tradeRequest) {
        return chatRoomRepository.findByTradeRequestId(tradeRequest.getId())
                .orElseGet(() -> {
                    ChatRoom room = chatRoomRepository.save(ChatRoom.create(tradeRequest));
                    addMemberIfAbsent(room, tradeRequest.getPost().getWriter(), 0);
                    addMemberIfAbsent(room, tradeRequest.getRequester(), 1);
                    chatMessageRepository.save(ChatMessage.system(room, "채팅방이 개설되었습니다."));
                    return room;
                });
    }

    @Transactional
    public ChatRoom openGroupRoomForTradeRequests(List<TradeRequest> tradeRequests) {
        if (tradeRequests == null || tradeRequests.isEmpty()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "At least one trade request is required.");
        }
        TradeRequest primaryRequest = tradeRequests.get(0);
        ChatRoom room = openRoomForTradeRequest(primaryRequest);
        room.markAsGroupRoom();
        addMemberIfAbsent(room, primaryRequest.getPost().getWriter(), 0);
        tradeRequests.forEach(request -> addMemberIfAbsent(room, request.getRequester(), 1));
        chatMessageRepository.save(ChatMessage.system(room, "공동구매 채팅방이 개설되었습니다."));
        return room;
    }

    public List<ChatRoomResponse> getRooms(Long userId, String filter) {
        List<ChatRoom> rooms = switch ((filter == null ? "ALL" : filter).toUpperCase()) {
            case "SHARE", "SALE", "SHARING" -> chatRoomRepository.findAllByParticipantIdAndPostTypes(
                    userId,
                    List.of(PostType.SHARE, PostType.SALE)
            );
            case "GROUP", "GROUP_BUY" -> chatRoomRepository.findAllByParticipantIdAndPostTypes(
                    userId,
                    List.of(PostType.GROUP_BUY)
            );
            default -> chatRoomRepository.findAllByParticipantId(userId);
        };

        return rooms.stream()
                .filter(room -> !"UNREAD".equalsIgnoreCase(filter) || unreadCount(room, userId) > 0)
                .map(room -> toResponse(room, userId))
                .sorted(Comparator
                        .comparing(ChatRoomResponse::pinned).reversed()
                        .thenComparing(ChatRoomResponse::updatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    public List<ChatMessageResponse> getMessages(Long userId, Long roomId) {
        ChatRoom room = getParticipantRoom(userId, roomId);
        List<ChatMessage> messages = chatMessageRepository.findAllByChatRoomIdOrderByCreatedAtAsc(room.getId());
        Set<Long> unreadByPartnerMessageIds = unreadByPartnerMessageIds(messages, userId, partnerUnreadCount(room, userId));

        return messages
                .stream()
                .map(message -> ChatMessageResponse.from(
                        message,
                        userId,
                        unreadByPartnerMessageIds.contains(message.getId())
                ))
                .toList();
    }

    @Transactional
    public ChatMessageResponse sendMessage(Long userId, Long roomId, ChatMessageRequest request) {
        return sendMessage(userId, roomId, request.content());
    }

    @Transactional
    public ChatMessageResponse sendMessage(Long userId, Long roomId, String content) {
        ChatRoom room = getParticipantRoom(userId, roomId);
        User sender = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));
        String trimmedContent = content == null ? "" : content.trim();
        if (trimmedContent.isBlank()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Message content is required.");
        }
        ChatMessage message = chatMessageRepository.save(ChatMessage.user(room, sender, trimmedContent));
        notifyUnreadMembers(room, sender, trimmedContent);
        return ChatMessageResponse.from(message, userId, true);
    }

    @Transactional
    public void markAsRead(Long userId, Long roomId) {
        ChatRoom room = getParticipantRoom(userId, roomId);
        room.markAsRead(userId);
        chatRoomMemberRepository.findByChatRoomIdAndUserId(roomId, userId)
                .ifPresent(ChatRoomMember::markAsRead);
    }

    public ChatRoomResponse getRoomByTradeRequest(Long userId, Long tradeRequestId) {
        ChatRoom room = chatRoomRepository.findByTradeRequestId(tradeRequestId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Chat room not found."));
        validateParticipant(room, userId);
        return toResponse(room, userId);
    }

    @Transactional
    public ChatRoomResponse togglePinned(Long userId, Long roomId) {
        ChatRoom room = getParticipantRoom(userId, roomId);
        room.togglePinned(userId);
        chatRoomMemberRepository.findByChatRoomIdAndUserId(roomId, userId)
                .ifPresent(ChatRoomMember::togglePinned);
        return toResponse(room, userId);
    }

    @Transactional
    public ChatRoomResponse toggleMuted(Long userId, Long roomId) {
        ChatRoom room = getParticipantRoom(userId, roomId);
        room.toggleMuted(userId);
        chatRoomMemberRepository.findByChatRoomIdAndUserId(roomId, userId)
                .ifPresent(ChatRoomMember::toggleMuted);
        return toResponse(room, userId);
    }

    public Long findRoomIdByTradeRequestId(Long tradeRequestId) {
        return chatRoomRepository.findByTradeRequestId(tradeRequestId)
                .map(ChatRoom::getId)
                .orElse(null);
    }

    public Long findPartnerId(Long userId, Long roomId) {
        return partner(getParticipantRoom(userId, roomId), userId).getId();
    }

    private ChatRoom getParticipantRoom(Long userId, Long roomId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Chat room not found."));
        validateParticipant(room, userId);
        return room;
    }

    private ChatRoomResponse toResponse(ChatRoom room, Long userId) {
        return ChatRoomResponse.from(
                room,
                userId,
                chatMessageRepository.findFirstByChatRoomIdOrderByCreatedAtDesc(room.getId()).orElse(null),
                partner(room, userId),
                unreadCount(room, userId),
                isPinned(room, userId),
                isMuted(room, userId),
                room.isGroupRoom(),
                participantCount(room)
        );
    }

    private void validateParticipant(ChatRoom room, Long userId) {
        if (!room.getWriter().getId().equals(userId)
                && !room.getRequester().getId().equals(userId)
                && !chatRoomMemberRepository.existsByChatRoomIdAndUserId(room.getId(), userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only chat room participants can access it.");
        }
    }

    private User partner(ChatRoom room, Long userId) {
        if (room.isGroupRoom()) {
            return room.getRequester();
        }
        return room.getWriter().getId().equals(userId) ? room.getRequester() : room.getWriter();
    }

    private int unreadCount(ChatRoom room, Long userId) {
        return chatRoomMemberRepository.findByChatRoomIdAndUserId(room.getId(), userId)
                .map(ChatRoomMember::getUnreadCount)
                .orElseGet(() -> room.getWriter().getId().equals(userId)
                        ? room.getWriterUnreadCount()
                        : room.getRequesterUnreadCount());
    }

    private int partnerUnreadCount(ChatRoom room, Long userId) {
        if (!room.isGroupRoom()) {
            return room.getWriter().getId().equals(userId)
                    ? room.getRequesterUnreadCount()
                    : room.getWriterUnreadCount();
        }
        return chatRoomMemberRepository.findAllByChatRoom(room)
                .stream()
                .filter(member -> !member.getUser().getId().equals(userId))
                .mapToInt(ChatRoomMember::getUnreadCount)
                .max()
                .orElse(0);
    }

    private boolean isPinned(ChatRoom room, Long userId) {
        return chatRoomMemberRepository.findByChatRoomIdAndUserId(room.getId(), userId)
                .map(ChatRoomMember::isPinned)
                .orElseGet(() -> room.isPinnedFor(userId));
    }

    private boolean isMuted(ChatRoom room, Long userId) {
        return chatRoomMemberRepository.findByChatRoomIdAndUserId(room.getId(), userId)
                .map(ChatRoomMember::isMuted)
                .orElseGet(() -> room.isMutedFor(userId));
    }

    private int participantCount(ChatRoom room) {
        int memberCount = chatRoomMemberRepository.findAllByChatRoom(room).size();
        return memberCount == 0 ? 2 : memberCount;
    }

    private void addMemberIfAbsent(ChatRoom room, User user, int unreadCount) {
        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(room.getId(), user.getId())) {
            chatRoomMemberRepository.save(ChatRoomMember.create(room, user, unreadCount));
        }
    }

    private void notifyUnreadMembers(ChatRoom room, User sender, String content) {
        List<ChatRoomMember> members = chatRoomMemberRepository.findAllByChatRoom(room);
        if (members.isEmpty()) {
            User receiver = partner(room, sender.getId());
            room.increaseUnreadFor(receiver);
            if (!room.isMutedFor(receiver.getId())) {
                notificationService.sendPushOnly(receiver.getId(), "CHAT_MESSAGE",
                        sender.getNickname() + "님의 새 채팅", content, "CHAT_ROOM", room.getId());
            }
            return;
        }

        members.stream()
                .filter(member -> !member.getUser().getId().equals(sender.getId()))
                .forEach(member -> {
                    member.increaseUnread();
                    if (!member.isMuted()) {
                        notificationService.sendPushOnly(member.getUser().getId(), "CHAT_MESSAGE",
                                sender.getNickname() + "님의 새 채팅", content, "CHAT_ROOM", room.getId());
                    }
                });
        room.touch();
    }

    private Set<Long> unreadByPartnerMessageIds(List<ChatMessage> messages, Long userId, int partnerUnreadCount) {
        Set<Long> unreadMessageIds = new HashSet<>();
        if (partnerUnreadCount <= 0) {
            return unreadMessageIds;
        }

        int remaining = partnerUnreadCount;
        for (int index = messages.size() - 1; index >= 0 && remaining > 0; index--) {
            ChatMessage message = messages.get(index);
            if (message.isSystemMessage() || message.getSender() == null) {
                continue;
            }
            if (message.getSender().getId().equals(userId)) {
                unreadMessageIds.add(message.getId());
                remaining--;
            }
        }
        return unreadMessageIds;
    }
}
