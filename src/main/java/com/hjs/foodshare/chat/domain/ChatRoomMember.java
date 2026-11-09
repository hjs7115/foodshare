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

    private LocalDateTime leftAt;
    private Boolean hiddenFromChatList;
    private Long lastReadMessageId;
    @Column(length=100) private String personalName;
    public boolean hasReadCursor(){return lastReadMessageId!=null;}
    public long getLastReadMessageId(){return lastReadMessageId==null?0:lastReadMessageId;}
    public void readThrough(long id){lastReadMessageId=Math.max(getLastReadMessageId(),id); unreadCount=0;}
    public String getPersonalName(){return personalName;}
    public void rename(String name){personalName=name;}


    public boolean isActive() { return leftAt == null; }

    public void leave() {
        if (leftAt != null) return;
        leftAt = LocalDateTime.now();
        unreadCount = 0;
        pinned = false;
        muted = true;
    }

    protected ChatRoomMember() {
    }

    private ChatRoomMember(ChatRoom chatRoom, User user, int unreadCount) {
        this.chatRoom = chatRoom;
        this.user = user;
        this.unreadCount = Math.max(unreadCount, 0);
        this.pinned = false;
        this.muted = false;
        this.joinedAt = LocalDateTime.now();
        this.lastReadMessageId=0L;
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
    public LocalDateTime getLeftAt() { return leftAt; }
    public boolean isHiddenFromChatList() { return Boolean.TRUE.equals(hiddenFromChatList); }
    public void hideFromChatList() { hiddenFromChatList = true; }

    public void rejoin() {
        leftAt = null;
        hiddenFromChatList = false;
        muted = false;
        unreadCount = 0;
    }
}
