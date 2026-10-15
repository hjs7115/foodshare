package com.hjs.foodshare.meal;
import com.hjs.foodshare.global.security.AuthUser;
import com.hjs.foodshare.global.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/meals")
public class MealController {
 private final MealService service;
 public MealController(MealService service){this.service=service;}
 @PostMapping("/recommend") public ApiResponse<MealService.Result> recommend(@AuthenticationPrincipal AuthUser user,@Valid @RequestBody MealRequest request){return ApiResponse.ok("Meals recommended.",service.recommend(user.userId(),request));}
}
