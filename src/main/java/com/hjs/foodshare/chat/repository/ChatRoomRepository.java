package com.hjs.foodshare.chat.repository;

import com.hjs.foodshare.chat.domain.ChatRoom;
import com.hjs.foodshare.post.domain.PostType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    Optional<ChatRoom> findByTradeRequestId(Long tradeRequestId);

    @Query("""
            select distinct cr
            from ChatRoom cr
            where cr.writer.id = :userId
               or cr.requester.id = :userId
               or exists (
                    select 1
                    from ChatRoomMember member
                    where member.chatRoom = cr and member.user.id = :userId
               )
            order by cr.updatedAt desc
            """)
    List<ChatRoom> findAllByParticipantId(@Param("userId") Long userId);

    @Query("""
            select cr
            from ChatRoom cr
            where cr.writer.id = :userId or cr.requester.id = :userId
            order by cr.updatedAt desc
            """)
    List<ChatRoom> findAllDirectByParticipantId(@Param("userId") Long userId);

    @Query("""
            select distinct cr
            from ChatRoom cr
            where (cr.writer.id = :userId
               or cr.requester.id = :userId
               or exists (
                    select 1
                    from ChatRoomMember member
                    where member.chatRoom = cr and member.user.id = :userId
               ))
              and cr.tradeRequest.post.postType in :postTypes
            order by cr.updatedAt desc
            """)
    List<ChatRoom> findAllByParticipantIdAndPostTypes(
            @Param("userId") Long userId,
            @Param("postTypes") List<PostType> postTypes
    );
}
