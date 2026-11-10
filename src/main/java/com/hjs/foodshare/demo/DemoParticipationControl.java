package com.hjs.foodshare.demo;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Separate per-account demo-only abuse counters. Ordinary account access is unaffected. */
@Entity
@Table(name="demo_participation_controls")
public class DemoParticipationControl {
    @Id public Long userId;
    @Column(nullable=false) public LocalDateTime windowStart;
    public int posts;
    public int requests;
    public int messages;
    public int violations;
    public LocalDateTime lastViolation;
    public int explicitAbuseSignals;
    public LocalDateTime abuseWindowStart;
    public boolean permanentlyRestricted;
    public LocalDateTime restrictedUntil;

    protected DemoParticipationControl() {}
    public DemoParticipationControl(Long userId, LocalDateTime now) {
        this.userId=userId;
        this.windowStart=now;
    }

    public void resetWindow(LocalDateTime now) {
        windowStart=now; posts=0; requests=0; messages=0;
    }
}
