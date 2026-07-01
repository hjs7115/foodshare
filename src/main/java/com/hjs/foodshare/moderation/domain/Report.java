package com.hjs.foodshare.moderation.domain;

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
import java.time.LocalDateTime;

@Entity
@Table(name = "reports")
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id", nullable = false)
    private User targetUser;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReportTargetType targetType;

    @Column(nullable = false)
    private Long targetId;

    @Column(nullable = false, length = 100)
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReportStatus status;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected Report() {
    }

    private Report(User reporter, User targetUser, ReportTargetType targetType, Long targetId,
                   String reason, String description) {
        this.reporter = reporter;
        this.targetUser = targetUser;
        this.targetType = targetType;
        this.targetId = targetId;
        this.reason = reason;
        this.description = description;
        this.status = ReportStatus.PENDING;
        this.createdAt = LocalDateTime.now();
    }

    public static Report create(User reporter, User targetUser, ReportTargetType targetType, Long targetId,
                                String reason, String description) {
        return new Report(reporter, targetUser, targetType, targetId, reason, description);
    }

    public Long getId() {
        return id;
    }

    public User getReporter() {
        return reporter;
    }

    public User getTargetUser() {
        return targetUser;
    }

    public ReportTargetType getTargetType() {
        return targetType;
    }

    public Long getTargetId() {
        return targetId;
    }

    public String getReason() {
        return reason;
    }

    public String getDescription() {
        return description;
    }

    public ReportStatus getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
