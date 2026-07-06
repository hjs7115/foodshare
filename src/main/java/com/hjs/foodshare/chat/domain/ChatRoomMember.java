package com.hjs.foodshare.chat.domain;

import com.hjs.foodshare.user.domain.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "chat_room_members",
        uniqueConstraints = @UniqueConstraint(name = "uk_chat_room_member", columnNames = {"chat_room_id", "user_id"})
)
public class ChatRoomMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private ChatRoom chatRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private int unreadCount;

    @Column(nullable = false)
    private boolean pinned;

    @Column(nullable = false)
    private boolean muted;

    @Column(nullable = false)
    private LocalDateTime joinedAt;

    protected ChatRoomMember() {
    }

    private ChatRoomMember(ChatRoom chatRoom, User user, int unreadCount) {
        this.chatRoom = chatRoom;
        this.user = user;
        this.unreadCount = Math.max(unreadCount, 0);
        this.pinned = false;
        this.muted = false;
        this.joinedAt = LocalDateTime.now();
    }

    public static ChatRoomMember create(ChatRoom chatRoom, User user, int unreadCount) {
        return new ChatRoomMember(chatRoom, user, unreadCount);
    }

    public void increaseUnread() {
        unreadCount++;
    }

    public void markAsRead() {
        unreadCount = 0;
    }

    public void togglePinned() {
        pinned = !pinned;
    }

    public void toggleMuted() {
        muted = !muted;
    }

    public Long getId() {
        return id;
    }

    public ChatRoom getChatRoom() {
        return chatRoom;
    }

    public User getUser() {
        return user;
    }

    public int getUnreadCount() {
        return unreadCount;
    }

    public boolean isPinned() {
        return pinned;
    }

    public boolean isMuted() {
        return muted;
    }

    public LocalDateTime getJoinedAt() {
        return joinedAt;
    }
}
