package com.hjs.foodshare.chat.domain;

import com.hjs.foodshare.trade.domain.TradeRequest;
import com.hjs.foodshare.user.domain.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_rooms")
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trade_request_id", nullable = false, unique = true)
    private TradeRequest tradeRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "writer_id", nullable = false)
    private User writer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    @Column(nullable = false)
    private int writerUnreadCount;

    @Column(nullable = false)
    private int requesterUnreadCount;

    @Column(nullable = false)
    private boolean writerPinned;

    @Column(nullable = false)
    private boolean requesterPinned;

    @Column(nullable = false)
    private boolean writerMuted;

    @Column(nullable = false)
    private boolean requesterMuted;

    @Column(nullable = false)
    private boolean groupRoom;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    protected ChatRoom() {
    }

    private ChatRoom(TradeRequest tradeRequest) {
        this.tradeRequest = tradeRequest;
        this.writer = tradeRequest.getPost().getWriter();
        this.requester = tradeRequest.getRequester();
        this.writerUnreadCount = 0;
        this.requesterUnreadCount = 1;
        this.writerPinned = false;
        this.requesterPinned = false;
        this.writerMuted = false;
        this.requesterMuted = false;
        this.groupRoom = false;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    public static ChatRoom create(TradeRequest tradeRequest) {
        return new ChatRoom(tradeRequest);
    }

    public void markAsGroupRoom() {
        this.groupRoom = true;
        touch();
    }

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }

    public void increaseUnreadFor(User receiver) {
        if (writer.getId().equals(receiver.getId())) {
            writerUnreadCount++;
        }
        if (requester.getId().equals(receiver.getId())) {
            requesterUnreadCount++;
        }
        touch();
    }

    public void markAsRead(Long userId) {
        if (writer.getId().equals(userId)) {
            writerUnreadCount = 0;
        }
        if (requester.getId().equals(userId)) {
            requesterUnreadCount = 0;
        }
    }

    public void togglePinned(Long userId) {
        if (writer.getId().equals(userId)) {
            writerPinned = !writerPinned;
        }
        if (requester.getId().equals(userId)) {
            requesterPinned = !requesterPinned;
        }
    }

    public void toggleMuted(Long userId) {
        if (writer.getId().equals(userId)) {
            writerMuted = !writerMuted;
        }
        if (requester.getId().equals(userId)) {
            requesterMuted = !requesterMuted;
        }
    }

    public boolean isPinnedFor(Long userId) {
        if (writer.getId().equals(userId)) {
            return writerPinned;
        }
        if (requester.getId().equals(userId)) {
            return requesterPinned;
        }
        return false;
    }

    public boolean isMutedFor(Long userId) {
        if (writer.getId().equals(userId)) {
            return writerMuted;
        }
        if (requester.getId().equals(userId)) {
            return requesterMuted;
        }
        return false;
    }

    public Long getId() {
        return id;
    }

    public TradeRequest getTradeRequest() {
        return tradeRequest;
    }

    public User getWriter() {
        return writer;
    }

    public User getRequester() {
        return requester;
    }

    public int getWriterUnreadCount() {
        return writerUnreadCount;
    }

    public int getRequesterUnreadCount() {
        return requesterUnreadCount;
    }

    public boolean isWriterPinned() {
        return writerPinned;
    }

    public boolean isRequesterPinned() {
        return requesterPinned;
    }

    public boolean isWriterMuted() {
        return writerMuted;
    }

    public boolean isRequesterMuted() {
        return requesterMuted;
    }

    public boolean isGroupRoom() {
        return groupRoom;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
