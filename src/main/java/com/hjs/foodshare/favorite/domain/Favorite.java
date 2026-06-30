package com.hjs.foodshare.favorite.domain;

import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.user.domain.User;
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
        name = "favorites",
        uniqueConstraints = @UniqueConstraint(columnNames = {"post_id", "user_id"})
)
public class Favorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private LocalDateTime createdAt;

    protected Favorite() {
    }

    private Favorite(Post post, User user) {
        this.post = post;
        this.user = user;
        this.createdAt = LocalDateTime.now();
    }

    public static Favorite create(Post post, User user) {
        return new Favorite(post, user);
    }

    public Long getId() {
        return id;
    }

    public Post getPost() {
        return post;
    }

    public User getUser() {
        return user;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
