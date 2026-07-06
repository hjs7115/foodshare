package com.hjs.foodshare.chat.controller;

import com.hjs.foodshare.chat.dto.ChatMessageRequest;
import com.hjs.foodshare.chat.dto.ChatMessageResponse;
import com.hjs.foodshare.chat.dto.ChatRoomResponse;
import com.hjs.foodshare.chat.service.ChatService;
import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.security.AuthUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/rooms")
    public ResponseEntity<ApiResponse<List<ChatRoomResponse>>> getRooms(
            @AuthenticationPrincipal AuthUser authUser,
            @RequestParam(defaultValue = "ALL") String filter
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Chat rooms found.", chatService.getRooms(authUser.userId(), filter)));
    }

    @GetMapping("/rooms/by-trade-request/{tradeRequestId}")
    public ResponseEntity<ApiResponse<ChatRoomResponse>> getRoomByTradeRequest(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long tradeRequestId
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Chat room found.",
                chatService.getRoomByTradeRequest(authUser.userId(), tradeRequestId)));
    }

    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getMessages(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long roomId
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Chat messages found.",
                chatService.getMessages(authUser.userId(), roomId)));
    }

    @PostMapping("/rooms/{roomId}/messages")
    public ResponseEntity<ApiResponse<ChatMessageResponse>> sendMessage(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long roomId,
            @Valid @RequestBody ChatMessageRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Chat message sent.",
                chatService.sendMessage(authUser.userId(), roomId, request)));
    }

    @PatchMapping("/rooms/{roomId}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long roomId
    ) {
        chatService.markAsRead(authUser.userId(), roomId);
        return ResponseEntity.ok(ApiResponse.ok("Chat room read.", null));
    }
}
