package com.hjs.foodshare.demo;
import jakarta.persistence.*;
@Entity @Table(name="demo_posts")
public class DemoPost {
 @Id private Long postId;
 protected DemoPost() {}
 public DemoPost(Long id) {this.postId=id;}
}
