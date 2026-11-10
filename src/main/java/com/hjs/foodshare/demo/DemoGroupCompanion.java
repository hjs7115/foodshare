package com.hjs.foodshare.demo;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** One additional participant per simulated group, never a general-purpose bot job. */
@Entity @Table(name="demo_group_companions")
public class DemoGroupCompanion {
 @Id public Long postId;
 @Column(nullable=false) public Long humanId;
 @Column(nullable=false) public Long primaryRequestId;
 @Column(nullable=false) public Long firstActorId;
 public Long requestId;
 public LocalDateTime roomSeenAt;
 public boolean outbound;
 public boolean greeted;
 public boolean finished;
 public boolean reset;
 public long repliedThrough;
 public int replyCount;
 public int failures;
 @Column(nullable=false) public LocalDateTime dueAt;
 protected DemoGroupCompanion() {}
 public DemoGroupCompanion(Long post,Long human,Long primary,Long first,boolean outbound){
  postId=post;humanId=human;primaryRequestId=primary;firstActorId=first;this.outbound=outbound;
  dueAt=LocalDateTime.now().plusSeconds(10);
 }
}
