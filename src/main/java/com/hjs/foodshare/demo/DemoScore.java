package com.hjs.foodshare.demo;
import jakarta.persistence.*;
@Entity @Table(name="demo_score_baselines")
public class DemoScore {
 @Id public Long userId;
 public double score;
 public long afterReviewId;
 protected DemoScore() {}
 public DemoScore(Long userId,double score,long afterReviewId){this.userId=userId;this.score=score;this.afterReviewId=afterReviewId;}
}
