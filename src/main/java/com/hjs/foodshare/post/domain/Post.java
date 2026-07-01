package com.hjs.foodshare.post.domain;

import com.hjs.foodshare.user.domain.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "posts")
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User writer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PostType postType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PostStatus status;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, length = 100)
    private String ingredientName;

    @Column(nullable = false, length = 50)
    private String quantity;

    @Column(nullable = false)
    private Integer price;

    @Column(nullable = false, length = 100)
    private String tradeLocation;

    @Column(nullable = false)
    private Double distanceKm;

    private Double latitude;

    private Double longitude;

    @Column(nullable = false)
    private LocalDate expirationDate;

    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    private Integer currentParticipantCount;

    private Integer targetParticipantCount;

    private LocalDate deadlineDate;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private boolean deleted;

    protected Post() {
    }

    private Post(User writer, PostType postType, String title, String ingredientName, String quantity,
                 Integer price, String tradeLocation, Double distanceKm, LocalDate expirationDate,
                 Double latitude, Double longitude, String imageUrl, String content, Integer currentParticipantCount,
                 Integer targetParticipantCount, LocalDate deadlineDate) {
        this.writer = writer;
        this.postType = postType;
        this.status = PostStatus.OPEN;
        this.title = title;
        this.ingredientName = ingredientName;
        this.quantity = quantity;
        this.price = price;
        this.tradeLocation = tradeLocation;
        this.distanceKm = distanceKm;
        this.latitude = latitude;
        this.longitude = longitude;
        this.expirationDate = expirationDate;
        this.imageUrl = imageUrl;
        this.content = content;
        this.currentParticipantCount = currentParticipantCount;
        this.targetParticipantCount = targetParticipantCount;
        this.deadlineDate = deadlineDate;
        this.createdAt = LocalDateTime.now();
        this.deleted = false;
    }

    public static Post create(User writer, PostType postType, String title, String ingredientName, String quantity,
                              Integer price, String tradeLocation, Double distanceKm, LocalDate expirationDate,
                              Double latitude, Double longitude, String imageUrl, String content, Integer currentParticipantCount,
                              Integer targetParticipantCount, LocalDate deadlineDate) {
        return new Post(writer, postType, title, ingredientName, quantity, price, tradeLocation,
                distanceKm, expirationDate, latitude, longitude, imageUrl, content, currentParticipantCount,
                targetParticipantCount, deadlineDate);
    }

    public Long getId() { return id; }

    public User getWriter() { return writer; }

    public PostType getPostType() { return postType; }

    public PostStatus getStatus() { return status; }

    public String getTitle() { return title; }

    public String getIngredientName() { return ingredientName; }

    public String getQuantity() { return quantity; }

    public Integer getPrice() { return price; }

    public String getTradeLocation() { return tradeLocation; }

    public Double getDistanceKm() { return distanceKm; }

    public Double getLatitude() { return latitude; }

    public Double getLongitude() { return longitude; }

    public LocalDate getExpirationDate() { return expirationDate; }

    public String getImageUrl() { return imageUrl; }

    public String getContent() { return content; }

    public Integer getCurrentParticipantCount() { return currentParticipantCount; }

    public Integer getTargetParticipantCount() { return targetParticipantCount; }

    public LocalDate getDeadlineDate() { return deadlineDate; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public boolean isDeleted() { return deleted; }

    public boolean isOpen() { return status == PostStatus.OPEN && !deleted; }

    public void update(PostType postType, String title, String ingredientName, String quantity,
                       Integer price, String tradeLocation, Double distanceKm, LocalDate expirationDate,
                       Double latitude, Double longitude, String imageUrl, String content, Integer currentParticipantCount,
                       Integer targetParticipantCount, LocalDate deadlineDate) {
        this.postType = postType;
        this.title = title;
        this.ingredientName = ingredientName;
        this.quantity = quantity;
        this.price = price;
        this.tradeLocation = tradeLocation;
        this.distanceKm = distanceKm;
        this.latitude = latitude;
        this.longitude = longitude;
        this.expirationDate = expirationDate;
        this.imageUrl = imageUrl;
        this.content = content;
        this.currentParticipantCount = currentParticipantCount;
        this.targetParticipantCount = targetParticipantCount;
        this.deadlineDate = deadlineDate;
    }

    public void delete() {
        this.deleted = true;
        this.status = PostStatus.CLOSED;
    }

    public void close() {
        this.status = PostStatus.CLOSED;
    }

    public void increaseParticipantCount() {
        if (currentParticipantCount == null) {
            currentParticipantCount = 1;
        }
        currentParticipantCount++;
        if (targetParticipantCount != null && currentParticipantCount >= targetParticipantCount) {
            close();
        }
    }
}
