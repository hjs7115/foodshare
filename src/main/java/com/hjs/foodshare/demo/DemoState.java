package com.hjs.foodshare.demo;
import jakarta.persistence.*;
@Entity @Table(name="demo_state")
public class DemoState {
 @Id private Long id = 1L;
 @Column(nullable=false) private boolean enabled;
 public DemoState() {}
 public boolean isEnabled(){return enabled;}
 public void setEnabled(boolean enabled){this.enabled=enabled;}
}
