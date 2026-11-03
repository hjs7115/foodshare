package com.hjs.foodshare.demo;
import jakarta.persistence.*;
@Entity @Table(name="demo_managers")
public class DemoManager {
 @Id private Long userId;
 protected DemoManager() {}
 public DemoManager(Long id) {this.userId=id;}
}
