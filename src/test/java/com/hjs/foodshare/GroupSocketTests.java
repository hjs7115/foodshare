package com.hjs.foodshare;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hjs.foodshare.chat.websocket.ChatWebSocketHandler;
import com.hjs.foodshare.chat.service.ChatService;
import com.hjs.foodshare.chat.dto.ChatMessageResponse;
import com.hjs.foodshare.global.security.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.*;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class GroupSocketTests {
 @Test void sendsToEveryRecipientAndSurvivesOneDisconnectedSession() throws Exception {
  var jwt=mock(JwtTokenProvider.class);var chat=mock(ChatService.class);
  var handler=new ChatWebSocketHandler(jwt,chat,new ObjectMapper().findAndRegisterModules());
  var sessions=new ArrayList<WebSocketSession>();
  for(long id=1;id<=4;id++){
   var session=mock(WebSocketSession.class);when(session.getUri()).thenReturn(URI.create("ws://localhost/ws/chat?token=t"+id));
   when(session.getAttributes()).thenReturn(new HashMap<>());when(session.isOpen()).thenReturn(true);
   when(jwt.parseAuthUser("t"+id)).thenReturn(new AuthUser(id,"test","test"));
   handler.afterConnectionEstablished(session);clearInvocations(session);sessions.add(session);
  }
  var message=new ChatMessageResponse(1L,10L,1L,"sender",null,"hello",false,true,true,LocalDateTime.now());
  when(chat.sendMessage(1L,10L,"hello")).thenReturn(message);
  when(chat.findPartnerId(1L,10L)).thenReturn(2L);
  when(chat.notificationRecipientIds(1L,10L)).thenReturn(List.of(2L,3L,4L));
  when(chat.canAccessRoom(anyLong(),eq(10L))).thenReturn(true);
  doThrow(new java.io.IOException("closed")).when(sessions.get(1)).sendMessage(any());
  handler.handleMessage(sessions.get(0),new TextMessage("{\"type\":\"SEND\",\"roomId\":10,\"content\":\"hello\"}"));
  verify(sessions.get(0),never()).sendMessage(any());
  for(int i=1;i<4;i++) verify(sessions.get(i)).sendMessage(argThat(m->m.getPayload().toString().contains("CHAT_NOTIFICATION")));
 }
}
