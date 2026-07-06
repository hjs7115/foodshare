package com.hjs.foodshare.chat.service;

import com.hjs.foodshare.chat.domain.ChatMessage;
import com.hjs.foodshare.chat.domain.ChatRoom;
import com.hjs.foodshare.chat.dto.ChatMessageRequest;
import com.hjs.foodshare.chat.dto.ChatMessageResponse;
import com.hjs.foodshare.chat.dto.ChatRoomResponse;
import com.hjs.foodshare.chat.repository.ChatMessageRepository;
import com.hjs.foodshare.chat.repository.ChatRoomRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.notification.service.NotificationService;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.trade.domain.TradeRequest;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public ChatService(
            ChatRoomRepository chatRoomRepository,
            ChatMessageRepository chatMessageRepository,
            UserRepository userRepository,
            NotificationService notificationService
    ) {
        this.chatRoomRepository = chatRoomRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public ChatRoom openRoomForTradeRequest(TradeRequest tradeRequest) {
        return chatRoomRepository.findByTradeRequestId(tradeRequest.getId())
                .orElseGet(() -> {
                    ChatRoom room = chatRoomRepository.save(ChatRoom.create(tradeRequest));
                    chatMessageRepository.save(ChatMessage.system(room, "채팅방이 개설되었습니다."));
                    return room;
                });
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
                .map(room -> ChatRoomResponse.from(
                        room,
                        userId,
                        chatMessageRepository.findFirstByChatRoomIdOrderByCreatedAtDesc(room.getId()).orElse(null)
                ))
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
        User receiver = partner(room, userId);
        room.increaseUnreadFor(receiver);
        notificationService.sendPushOnly(
                receiver.getId(),
                "CHAT_MESSAGE",
                sender.getNickname() + "님의 새 채팅",
                "새 채팅이 도착했습니다.",
                "CHAT_ROOM",
                room.getId()
        );
        return ChatMessageResponse.from(message, userId, true);
    }

    @Transactional
    public void markAsRead(Long userId, Long roomId) {
        ChatRoom room = getParticipantRoom(userId, roomId);
        room.markAsRead(userId);
    }

    public ChatRoomResponse getRoomByTradeRequest(Long userId, Long tradeRequestId) {
        ChatRoom room = chatRoomRepository.findByTradeRequestId(tradeRequestId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Chat room not found."));
        validateParticipant(room, userId);
        return ChatRoomResponse.from(
                room,
                userId,
                chatMessageRepository.findFirstByChatRoomIdOrderByCreatedAtDesc(room.getId()).orElse(null)
        );
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

    private void validateParticipant(ChatRoom room, Long userId) {
        if (!room.getWriter().getId().equals(userId) && !room.getRequester().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only chat room participants can access it.");
        }
    }

    private User partner(ChatRoom room, Long userId) {
        return room.getWriter().getId().equals(userId) ? room.getRequester() : room.getWriter();
    }

    private int unreadCount(ChatRoom room, Long userId) {
        return room.getWriter().getId().equals(userId)
                ? room.getWriterUnreadCount()
                : room.getRequesterUnreadCount();
    }

    private int partnerUnreadCount(ChatRoom room, Long userId) {
        return room.getWriter().getId().equals(userId)
                ? room.getRequesterUnreadCount()
                : room.getWriterUnreadCount();
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
