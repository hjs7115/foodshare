package com.hjs.foodshare.shopping;
import jakarta.persistence.*;
@Entity @Table(name = "shopping_preferences")
public class ShoppingPreference {
    @Id Long userId;
    @Column(nullable = false) int shoppingDay = 7;
    Boolean reminderEnabled;
    Integer reminderMinute;
    java.time.LocalDate lastReminderWeek;
    protected ShoppingPreference() {}
    ShoppingPreference(Long userId, int day) {this.userId=userId;this.shoppingDay=day;}
}
