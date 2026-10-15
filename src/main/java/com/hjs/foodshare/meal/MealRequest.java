package com.hjs.foodshare.meal;
import jakarta.validation.constraints.*;
import java.util.List;
public record MealRequest(
 @NotNull @Size(max=60) List<@NotNull Long> fridgeItemIds,
 @NotNull @Size(max=30) List<@NotBlank @Size(max=50) String> ingredients,
 @Min(10) @Max(60) int maxMinutes,
 @Size(max=120) String preference
) {}
