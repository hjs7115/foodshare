package com.hjs.foodshare.fridge.open;
import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.security.AuthUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
@RestController @RequestMapping("/api/open-fridge")
public class OpenFridgeController {
 private final OpenFridgeService service;
 public OpenFridgeController(OpenFridgeService service){this.service=service;}
 public record Photo(@Size(max=500) String imageUrl){}
 @PutMapping("/{id}/photo") public Object photo(@AuthenticationPrincipal AuthUser user,@PathVariable Long id,@Valid @RequestBody Photo request){return ApiResponse.ok("Photo updated",service.photo(user.userId(),id,request.imageUrl()));}
 public record Publish(@NotBlank @Size(max=50) String amount){}
 @GetMapping public Object nearby(@AuthenticationPrincipal AuthUser user,@RequestParam(defaultValue="") String keyword){return ApiResponse.ok("Nearby fridges",service.nearby(user.userId(),keyword));}
 @GetMapping("/mine") public Object mine(@AuthenticationPrincipal AuthUser user){return ApiResponse.ok("My sharing settings",service.mine(user.userId()));}
 @PutMapping("/{id}") public Object publish(@AuthenticationPrincipal AuthUser user,@PathVariable Long id,@Valid @RequestBody Publish request){return ApiResponse.ok("Shared",service.publish(user.userId(),id,request.amount().strip()));}
 @DeleteMapping("/{id}") public Object hide(@AuthenticationPrincipal AuthUser user,@PathVariable Long id){service.hide(user.userId(),id);return ApiResponse.ok("Hidden",null);}
 @PostMapping("/{id}/requests") public Object request(@AuthenticationPrincipal AuthUser user,@PathVariable Long id){return ApiResponse.ok("Requested",service.request(user.userId(),id));}
}
