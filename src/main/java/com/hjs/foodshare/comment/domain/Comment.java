package com.hjs.foodshare.comment.domain;

import com.hjs.foodshare.post.domain.Post;
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
@Table(name = "comments")
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User writer;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected Comment() {
    }

    private Comment(Post post, User writer, String content) {
        this.post = post;
        this.writer = writer;
        this.content = content;
        this.createdAt = LocalDateTime.now();
    }

    public static Comment create(Post post, User writer, String content) {
        return new Comment(post, writer, content);
    }

    public Long getId() {
        return id;
    }

    public Post getPost() {
        return post;
    }

    public User getWriter() {
        return writer;
    }

    public String getContent() {
        return content;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void updateContent(String content) {
        this.content = content;
    }
}
