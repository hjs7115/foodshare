package com.hjs.foodshare.shopping;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "shopping_items", indexes = @Index(name = "idx_shopping_user_week", columnList = "user_id,week_start"))
public class ShoppingItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "user_id", nullable = false) Long userId;
    @Column(name = "week_start", nullable = false) LocalDate weekStart;
    @Column(nullable = false, length = 100) String name;
    @Column(nullable = false, length = 100) String amount;
    @Column(nullable = false, length = 120) String source;
    @Column(nullable = false, length = 12) String state = "NEED";
    Long fridgeItemId;
    protected ShoppingItem() {}
    ShoppingItem(Long userId, LocalDate week, String name, String amount, String source) {
        this.userId=userId;this.weekStart=week;this.name=name;this.amount=amount;this.source=source;
    }
}
