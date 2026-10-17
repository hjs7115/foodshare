package com.hjs.foodshare.meal;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity @Table(name="saved_meals",uniqueConstraints=@UniqueConstraint(name="uk_saved_meal_user_recipe",columnNames={"user_id","recipe_key"}),indexes=@Index(name="idx_saved_meal_user",columnList="user_id"))
public class SavedMeal {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
 @Column(name="user_id",nullable=false) Long userId;
 @Column(name="recipe_key",nullable=false,length=64) String recipeKey;
 @Column(columnDefinition="text",nullable=false) String recipeJson;
 boolean favorite;
 LocalDateTime cookedAt;
 LocalDateTime updatedAt;
 protected SavedMeal(){}
}
