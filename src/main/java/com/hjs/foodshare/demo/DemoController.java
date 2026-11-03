package com.hjs.foodshare.demo;
import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.security.AuthUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
@RestController @RequestMapping("/api/demo-mode")
public class DemoController {
 private final DemoVisibility demo;
 public DemoController(DemoVisibility demo){this.demo=demo;}
 public record Update(@NotNull Boolean enabled) {}
 @GetMapping public ApiResponse<DemoVisibility.Status> status(@AuthenticationPrincipal AuthUser user){return ApiResponse.ok("Demo mode status",demo.status(user.userId()));}
 @PutMapping public ApiResponse<DemoVisibility.Status> update(@AuthenticationPrincipal AuthUser user,@Valid @RequestBody Update request){return ApiResponse.ok("Demo mode updated",demo.setEnabled(user.userId(),request.enabled()));}
}
