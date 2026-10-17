package com.hjs.foodshare.meal;
import com.hjs.foodshare.global.security.AuthUser;
import com.hjs.foodshare.global.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/meals")
public class MealController {
 @org.springframework.beans.factory.annotation.Autowired private MealLibraryService library;
 public record Save(MealCatalog.Recipe recipe,boolean cooked){}
 @GetMapping("/library") public Object list(@AuthenticationPrincipal AuthUser user){return ApiResponse.ok("Meal library",library.list(user.userId()));}
 @PostMapping("/library") public Object save(@AuthenticationPrincipal AuthUser user,@RequestBody Save body){return ApiResponse.ok("Saved",library.save(user.userId(),body.recipe(),body.cooked()));}
 @DeleteMapping("/library/{id}") public Object delete(@AuthenticationPrincipal AuthUser user,@PathVariable Long id){library.delete(user.userId(),id);return ApiResponse.ok("Deleted",null);}
 private final MealService service;
 public MealController(MealService service){this.service=service;}
 @PostMapping("/recommend") public ApiResponse<MealService.Result> recommend(@AuthenticationPrincipal AuthUser user,@Valid @RequestBody MealRequest request){return ApiResponse.ok("Meals recommended.",service.recommend(user.userId(),request));}
}
