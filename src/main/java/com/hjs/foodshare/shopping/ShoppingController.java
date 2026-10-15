package com.hjs.foodshare.shopping;

import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.security.AuthUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController @RequestMapping("/api/shopping")
public class ShoppingController {
    private final ShoppingService service;
    public ShoppingController(ShoppingService service) {this.service=service;}
    public record Add(LocalDate week, String source, List<ShoppingService.Entry> items) {}
    public record Update(String state, String amount) {}
    public record Reminder(boolean enabled, String time, LocalDate week) {}
    public record FridgeRegistration(String amount, LocalDate expiryDate, String storagePlace) {}
    public record Preference(int shoppingDay, LocalDate week) {}
    @GetMapping public Object get(@AuthenticationPrincipal AuthUser u,@RequestParam(required=false) LocalDate week) {return ApiResponse.ok("Shopping list",service.get(u.userId(),week));}
    @PostMapping public Object add(@AuthenticationPrincipal AuthUser u,@RequestBody Add body) {return ApiResponse.ok("Saved",service.add(u.userId(),body.week(),body.source(),body.items()));}
    @PatchMapping("/items/{id}") public Object update(@AuthenticationPrincipal AuthUser u,@PathVariable Long id,@RequestBody Update body) {return ApiResponse.ok("Saved",service.update(u.userId(),id,body.state(),body.amount()));}
    @DeleteMapping("/items/{id}") public Object delete(@AuthenticationPrincipal AuthUser u,@PathVariable Long id) {return ApiResponse.ok("Deleted",service.delete(u.userId(),id));}
    @PutMapping("/preference") public Object day(@AuthenticationPrincipal AuthUser u,@RequestBody Preference body) {return ApiResponse.ok("Saved",service.day(u.userId(),body.shoppingDay(),body.week()));}
    @PutMapping("/reminder") public Object reminder(@AuthenticationPrincipal AuthUser u,@RequestBody Reminder body) {return ApiResponse.ok("Saved",service.reminder(u.userId(),body.enabled(),body.time(),body.week()));}
    @PostMapping("/items/{id}/fridge") public Object register(@AuthenticationPrincipal AuthUser u,@PathVariable Long id,@RequestBody FridgeRegistration body) {return ApiResponse.ok("Registered",service.registerFridge(u.userId(),id,body.amount(),body.expiryDate(),body.storagePlace()));}
}
