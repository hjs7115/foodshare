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
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages",indexes=@jakarta.persistence.Index(name="idx_chat_room_message",columnList="chat_room_id,id"),uniqueConstraints=@jakarta.persistence.UniqueConstraint(name="uk_chat_client_message",columnNames={"chat_room_id","sender_id","client_message_id"}))
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private ChatRoom chatRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private User sender;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    @Column(name="client_message_id",length=80) private String clientMessageId;
    public String getClientMessageId(){return clientMessageId;}
    public void setClientMessageId(String id){clientMessageId=id;}


    @Column(nullable = false)
    private boolean systemMessage;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected ChatMessage() {
    }

    private ChatMessage(ChatRoom chatRoom, User sender, String content, boolean systemMessage) {
        this.chatRoom = chatRoom;
        this.sender = sender;
        this.content = content;
        this.systemMessage = systemMessage;
        this.createdAt = LocalDateTime.now();
    }

    public static ChatMessage system(ChatRoom chatRoom, String content) {
        return new ChatMessage(chatRoom, null, content, true);
    }

    public static ChatMessage user(ChatRoom chatRoom, User sender, String content) {
        return new ChatMessage(chatRoom, sender, content, false);
    }

    public Long getId() {
        return id;
    }

    public ChatRoom getChatRoom() {
        return chatRoom;
    }

    public User getSender() {
        return sender;
    }

    public String getContent() {
        return content;
    }

    public boolean isSystemMessage() {
        return systemMessage;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
