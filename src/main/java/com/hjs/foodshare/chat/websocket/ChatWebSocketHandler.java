package com.hjs.foodshare.chat.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hjs.foodshare.chat.dto.ChatMessageResponse;
import com.hjs.foodshare.chat.service.ChatService;
import com.hjs.foodshare.global.security.AuthUser;
import com.hjs.foodshare.global.security.JwtTokenProvider;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private static final String USER_ID_ATTRIBUTE = "userId";
    private static final String ROOM_ID_ATTRIBUTE = "roomId";

    private final JwtTokenProvider jwtTokenProvider;
    private final ChatService chatService;
    private final ObjectMapper objectMapper;
    private final Map<Long, Set<WebSocketSession>> roomSessions = new ConcurrentHashMap<>();
    private final Map<Long, Set<WebSocketSession>> userSessions = new ConcurrentHashMap<>();

    public ChatWebSocketHandler(JwtTokenProvider jwtTokenProvider, ChatService chatService, ObjectMapper objectMapper) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.chatService = chatService;
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String token = queryParam(session.getUri(), "token");
        if (token == null || token.isBlank()) {
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Authentication token is required."));
            return;
        }

        AuthUser authUser = jwtTokenProvider.parseAuthUser(token);
        session.getAttributes().put(USER_ID_ATTRIBUTE, authUser.userId());
        userSessions.computeIfAbsent(authUser.userId(), key -> ConcurrentHashMap.newKeySet()).add(session);
        send(session, Map.of("type", "CONNECTED"));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        WebSocketChatMessage payload = objectMapper.readValue(message.getPayload(), WebSocketChatMessage.class);
        Long userId = (Long) session.getAttributes().get(USER_ID_ATTRIBUTE);

        if ("SUBSCRIBE".equalsIgnoreCase(payload.type())) {
            subscribe(session, payload.roomId());
            send(session, Map.of("type", "SUBSCRIBED", "roomId", payload.roomId()));
            return;
        }

        if ("SEND".equalsIgnoreCase(payload.type())) {
            Long roomId = currentRoomId(session, payload.roomId());
            ChatMessageResponse response = chatService.sendMessage(userId, roomId, payload.content());
            Long receiverId = chatService.findPartnerId(userId, roomId);
            broadcastMessage(roomId, response, userId, receiverId);
            sendNotificationToUser(receiverId, roomId, response);
            return;
        }

        if ("READ".equalsIgnoreCase(payload.type())) {
            Long roomId = currentRoomId(session, payload.roomId());
            chatService.markAsRead(userId, roomId);
            broadcast(roomId, Map.of("type", "READ", "roomId", roomId, "readerId", userId));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Object userId = session.getAttributes().get(USER_ID_ATTRIBUTE);
        if (userId instanceof Long value) {
            Set<WebSocketSession> sessions = userSessions.get(value);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    userSessions.remove(value);
                }
            }
        }

        Object roomId = session.getAttributes().get(ROOM_ID_ATTRIBUTE);
        if (roomId instanceof Long value) {
            Set<WebSocketSession> sessions = roomSessions.get(value);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    roomSessions.remove(value);
                }
            }
        }
    }

    private void subscribe(WebSocketSession session, Long roomId) {
        Object previousRoomId = session.getAttributes().get(ROOM_ID_ATTRIBUTE);
        if (previousRoomId instanceof Long value && !value.equals(roomId)) {
            Set<WebSocketSession> sessions = roomSessions.get(value);
            if (sessions != null) {
                sessions.remove(session);
            }
        }
        session.getAttributes().put(ROOM_ID_ATTRIBUTE, roomId);
        roomSessions.computeIfAbsent(roomId, key -> ConcurrentHashMap.newKeySet()).add(session);
    }

    private Long currentRoomId(WebSocketSession session, Long requestedRoomId) {
        if (requestedRoomId != null) {
            return requestedRoomId;
        }
        Object roomId = session.getAttributes().get(ROOM_ID_ATTRIBUTE);
        if (roomId instanceof Long value) {
            return value;
        }
        throw new IllegalArgumentException("Chat room is not subscribed.");
    }

    private void broadcast(Long roomId, Map<String, Object> payload) throws Exception {
        Set<WebSocketSession> sessions = roomSessions.getOrDefault(roomId, Set.of());
        String json = objectMapper.writeValueAsString(payload);
        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(json));
            }
        }
    }

    private void broadcastMessage(Long roomId, ChatMessageResponse response, Long senderId, Long receiverId) throws Exception {
        Set<WebSocketSession> sessions = roomSessions.getOrDefault(roomId, Set.of());
        for (WebSocketSession session : sessions) {
            if (!session.isOpen()) {
                continue;
            }

            Long sessionUserId = (Long) session.getAttributes().get(USER_ID_ATTRIBUTE);
            ChatMessageResponse sessionResponse = responseForUser(response, sessionUserId, senderId, receiverId);
            send(session, Map.of("type", "MESSAGE", "roomId", roomId, "message", sessionResponse));
        }
    }

    private void sendNotificationToUser(Long userId, Long roomId, ChatMessageResponse response) throws Exception {
        Set<WebSocketSession> sessions = userSessions.getOrDefault(userId, Set.of());
        for (WebSocketSession session : sessions) {
            if (!session.isOpen() || isSubscribedToRoom(session, roomId)) {
                continue;
            }

            ChatMessageResponse sessionResponse = responseForUser(response, userId, response.senderId(), userId);
            send(session, Map.of("type", "CHAT_NOTIFICATION", "roomId", roomId, "message", sessionResponse));
        }
    }

    private ChatMessageResponse responseForUser(
            ChatMessageResponse response,
            Long currentUserId,
            Long senderId,
            Long receiverId
    ) {
        boolean mine = response.senderId() != null && response.senderId().equals(currentUserId);
        boolean unreadByPartner = mine && receiverId != null && !receiverId.equals(senderId);

        return new ChatMessageResponse(
                response.messageId(),
                response.chatRoomId(),
                response.senderId(),
                response.senderNickname(),
                response.senderProfileImage(),
                response.content(),
                response.systemMessage(),
                mine,
                unreadByPartner,
                response.createdAt()
        );
    }

    private boolean isSubscribedToRoom(WebSocketSession session, Long roomId) {
        Object subscribedRoomId = session.getAttributes().get(ROOM_ID_ATTRIBUTE);
        return subscribedRoomId instanceof Long value && value.equals(roomId);
    }

    private void sendToUser(Long userId, Map<String, Object> payload) throws Exception {
        Set<WebSocketSession> sessions = userSessions.getOrDefault(userId, Set.of());
        String json = objectMapper.writeValueAsString(payload);
        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(json));
            }
        }
    }

    private void send(WebSocketSession session, Map<String, Object> payload) throws Exception {
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
    }

    private String queryParam(URI uri, String key) {
        if (uri == null || uri.getQuery() == null) {
            return null;
        }
        for (String pair : uri.getQuery().split("&")) {
            String[] parts = pair.split("=", 2);
            if (parts.length == 2 && parts[0].equals(key)) {
                return URLDecoder.decode(parts[1], StandardCharsets.UTF_8);
            }
        }
        return null;
    }
}
