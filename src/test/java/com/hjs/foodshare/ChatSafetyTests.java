package com.hjs.foodshare;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hjs.foodshare.chat.service.ChatService;
import com.hjs.foodshare.chat.repository.ChatRoomMemberRepository;
import com.hjs.foodshare.chat.websocket.ChatWebSocketHandler;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.global.security.JwtTokenProvider;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.post.dto.PostCreateRequest;
import com.hjs.foodshare.post.service.PostService;
import com.hjs.foodshare.trade.service.TradeRequestService;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.time.LocalDate;
import java.net.URI;
import java.util.HashMap;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

@SpringBootTest
@Transactional
class ChatSafetyTests {
    @Autowired ChatService chats;
    @Autowired UserRepository users;
    @Autowired PostService posts;
    @Autowired TradeRequestService trades;
    @Autowired JwtTokenProvider jwt;
    @Autowired ChatRoomMemberRepository members;

    private User user(String name) {
        return users.save(User.create(name, name, name + "@test.local", "password", "010" + name, "Seoul"));
    }
    private Long room(User owner, User first, User second) {
        var post = posts.createPost(owner.getId(), new PostCreateRequest(
            second == null ? PostType.SHARE : PostType.GROUP_BUY, "Test", "Apple", "3", 0,
            "Seoul", 0.0, 37.5, 127.0, LocalDate.now().plusDays(5), null, "Test",
            second == null ? null : 1, second == null ? null : 3,
            second == null ? null : LocalDate.now().plusDays(2)));
        var firstRequest = trades.createRequest(post.postId(), first.getId());
        var accepted = trades.accept(firstRequest.requestId(), owner.getId());
        if (second == null) return accepted.chatRoomId();
        var secondRequest = trades.createRequest(post.postId(), second.getId());
        return trades.accept(secondRequest.requestId(), owner.getId()).chatRoomId();
    }
    private WebSocketSession session(User user, ChatWebSocketHandler handler) throws Exception {
        var session = mock(WebSocketSession.class);
        when(session.getAttributes()).thenReturn(new HashMap<>());
        when(session.isOpen()).thenReturn(true);
        when(session.getUri()).thenReturn(URI.create("ws://localhost/ws/chat?token=" + jwt.createAccessToken(user)));
        handler.afterConnectionEstablished(session);
        clearInvocations(session);
        return session;
    }
    @Test void participantProfileUsesCurrentUserPhotoAndRestrictsAccess() {
        var owner=user("profileowner"); var peer=user("profilepeer"); var outsider=user("profileoutsider");
        var id=room(owner,peer,null);
        peer.updateProfile("새닉네임",null,"/uploads/new-photo.jpg");
        var profile=chats.getParticipantProfile(owner.getId(),id,peer.getId());
        assertEquals("새닉네임",profile.nickname());assertEquals("/uploads/new-photo.jpg",profile.profileImage());
        assertEquals(0,profile.shareCount());
        assertThrows(BusinessException.class,()->chats.getParticipantProfile(outsider.getId(),id,peer.getId()));
        assertThrows(BusinessException.class,()->chats.getParticipantProfile(owner.getId(),id,outsider.getId()));
        chats.sendMessage(peer.getId(),id,"photo test");
        peer.updateProfile("최신이름",null,"/uploads/latest.jpg");
        assertEquals("/uploads/latest.jpg",chats.getRooms(owner.getId(),"ALL").getFirst().partnerProfileImage());
        assertTrue(chats.getMessages(owner.getId(),id).stream().anyMatch(m->"/uploads/latest.jpg".equals(m.senderProfileImage())));
    }
    @Test void outsiderCannotSubscribeOrReceiveNewMessages() throws Exception {
        var owner = user("owner"); var peer = user("peer"); var outsider = user("outsider");
        var id = room(owner, peer, null);
        var handler = new ChatWebSocketHandler(jwt, chats, new ObjectMapper().findAndRegisterModules());
        var denied = session(outsider, handler);
        assertThrows(BusinessException.class, () -> handler.handleMessage(denied,
            new TextMessage("{\"type\":\"SUBSCRIBE\",\"roomId\":" + id + "}")));
        assertFalse(chats.canAccessRoom(outsider.getId(), id));
        var sender = session(owner, handler);
        handler.handleMessage(sender, new TextMessage("{\"type\":\"SEND\",\"roomId\":" + id + ",\"content\":\"hello\"}"));
        verify(denied, never()).sendMessage(any());
    }
    @Test void groupLeaveKeepsHistoryAndOtherMembersButRevokesExistingSocket() throws Exception {
        var owner = user("groupowner"); var first = user("first"); var second = user("second");
        var id = room(owner, first, second);
        chats.sendMessage(owner.getId(), id, "keep this history");
        var handler = new ChatWebSocketHandler(jwt, chats, new ObjectMapper().findAndRegisterModules());
        var leaving = session(first, handler);
        handler.handleMessage(leaving, new TextMessage("{\"type\":\"SUBSCRIBE\",\"roomId\":" + id + "}"));
        clearInvocations(leaving);
        chats.leaveRoom(first.getId(), id);
        assertTrue(chats.getRooms(first.getId(), "ALL").isEmpty());
        assertThrows(BusinessException.class, () -> chats.getMessages(first.getId(), id));
        assertThrows(BusinessException.class, () -> chats.sendMessage(first.getId(), id, "denied"));
        assertEquals(2, chats.getRooms(second.getId(), "ALL").getFirst().participantCount());
        assertTrue(chats.getMessages(second.getId(), id).stream().anyMatch(m -> "keep this history".equals(m.content())));
        var sender = session(owner, handler);
        handler.handleMessage(sender, new TextMessage("{\"type\":\"SEND\",\"roomId\":" + id + ",\"content\":\"after leave\"}"));
        verify(leaving, never()).sendMessage(any());
        assertEquals(0, members.findByChatRoomIdAndUserId(id, first.getId()).orElseThrow().getUnreadCount());
    }
    @Test void directLeavePreservesPeersHistoryAndAccess() {
        var owner = user("directowner"); var peer = user("directpeer");
        var id = room(owner, peer, null);
        chats.sendMessage(owner.getId(), id, "keep");
        chats.leaveRoom(owner.getId(), id);
        assertFalse(chats.canAccessRoom(owner.getId(), id));
        assertTrue(chats.canAccessRoom(peer.getId(), id));
        assertEquals(1, chats.getRooms(peer.getId(), "ALL").size());
        assertTrue(chats.getMessages(peer.getId(), id).stream().anyMatch(m -> "keep".equals(m.content())));
    }
}
