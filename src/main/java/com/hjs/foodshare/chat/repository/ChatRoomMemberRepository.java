package com.hjs.foodshare.chat.repository;

import com.hjs.foodshare.chat.domain.ChatRoom;
import com.hjs.foodshare.chat.domain.ChatRoomMember;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoomMemberRepository extends JpaRepository<ChatRoomMember, Long> {

    boolean existsByChatRoomIdAndUserId(Long chatRoomId, Long userId);

    Optional<ChatRoomMember> findByChatRoomIdAndUserId(Long chatRoomId, Long userId);

    List<ChatRoomMember> findAllByChatRoom(ChatRoom chatRoom);

    List<ChatRoomMember> findAllByChatRoomId(Long chatRoomId);
}
