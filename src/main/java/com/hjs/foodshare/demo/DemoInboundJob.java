package com.hjs.foodshare.demo;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Persistent one-shot inbound simulation for a post created while demo mode was enabled. */
@Entity
@Table(name = "demo_inbound_jobs")
public class DemoInboundJob {
    @Id public Long postId;
    @Column(nullable = false) public Long writerId;
    @Column(nullable = false) public LocalDateTime dueAt;
    @Column(nullable = false) public LocalDateTime createdAt;
    public Long requestId;
    public LocalDateTime acceptedAt;
    public boolean greeted;
    public boolean screened;
    public boolean skippedForUnrelatedContent;
    public boolean finished;
    /** Nullable for existing production rows; null means not reset. */
    public Boolean reset;
    public int attempts;
    public long repliedThrough;
    public int replyCount;
    protected DemoInboundJob() {}
    public DemoInboundJob(Long postId, Long writerId) {
        this.postId = postId;
        this.writerId = writerId;
        this.createdAt = LocalDateTime.now();
        this.dueAt = createdAt.plusSeconds(10);
    }
}
