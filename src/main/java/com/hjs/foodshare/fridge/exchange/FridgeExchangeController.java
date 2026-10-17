package com.hjs.foodshare.fridge.exchange;
import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.security.AuthUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
@RestController @RequestMapping("/api/fridge-exchanges")
public class FridgeExchangeController {
 private final FridgeExchangeService service;
 public FridgeExchangeController(FridgeExchangeService service){this.service=service;}
 public record Meeting(java.time.LocalDateTime at,String place){}
 @PutMapping("/{id}/meeting") public Object meeting(@AuthenticationPrincipal AuthUser user,@PathVariable Long id,@RequestBody Meeting body){return ApiResponse.ok("Meeting proposed",service.meeting(user.userId(),id,body.at(),body.place()));}
 public record Proposal(@NotNull Long offeredItemId,@NotNull Long wantedItemId){}
 @GetMapping public Object mine(@AuthenticationPrincipal AuthUser user){return ApiResponse.ok("Exchange proposals",service.mine(user.userId()));}
 @PostMapping public Object propose(@AuthenticationPrincipal AuthUser user,@Valid @RequestBody Proposal p){return ApiResponse.ok("Proposed",service.propose(user.userId(),p.offeredItemId(),p.wantedItemId()));}
 @PostMapping("/{id}/{action}") public Object act(@AuthenticationPrincipal AuthUser user,@PathVariable Long id,@PathVariable String action){return ApiResponse.ok("Updated",service.act(user.userId(),id,action));}
}
