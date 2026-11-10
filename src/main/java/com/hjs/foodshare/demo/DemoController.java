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
 private final DemoSimulationService simulation;
 private final DemoSafetyService safety;
 public DemoController(DemoVisibility demo,DemoSimulationService simulation,DemoSafetyService safety){this.demo=demo;this.simulation=simulation;this.safety=safety;}
 @PostMapping("/restore-account/{targetUserId}") public ApiResponse<Void> restore(@AuthenticationPrincipal AuthUser user,@PathVariable Long targetUserId){demo.requireResetPermission(user.userId());safety.clear(targetUserId);return ApiResponse.ok("시연 이용 제한을 해제했습니다.",null);}
 @PostMapping("/reset-mine") public ApiResponse<Integer> reset(@AuthenticationPrincipal AuthUser user){demo.requireResetPermission(user.userId());return ApiResponse.ok("내 시뮬레이션을 초기화했습니다.",simulation.resetMine(user.userId()));}
 public record Update(@NotNull Boolean enabled) {}
 @GetMapping public ApiResponse<DemoVisibility.Status> status(@AuthenticationPrincipal AuthUser user){return ApiResponse.ok("Demo mode status",demo.status(user.userId()));}
 @PutMapping public ApiResponse<DemoVisibility.Status> update(@AuthenticationPrincipal AuthUser user,@Valid @RequestBody Update request){return ApiResponse.ok("Demo mode updated",demo.setEnabled(user.userId(),request.enabled()));}
}
