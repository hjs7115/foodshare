package com.hjs.foodshare.chat.repository;

import com.hjs.foodshare.chat.domain.ChatMessage;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findAllByChatRoomIdOrderByCreatedAtAsc(Long chatRoomId);

    Optional<ChatMessage> findFirstByChatRoomIdOrderByCreatedAtDesc(Long chatRoomId);
    Optional<ChatMessage> findFirstByChatRoomIdOrderByIdDesc(Long chatRoomId);

    Optional<ChatMessage> findByChatRoomIdAndSenderIdAndClientMessageId(Long roomId,Long senderId,String clientMessageId);
    void deleteAllByChatRoomId(Long chatRoomId);
}
