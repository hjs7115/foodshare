package com.hjs.foodshare.fridge.controller;

import com.hjs.foodshare.fridge.dto.FridgeItemRequest;
import com.hjs.foodshare.fridge.dto.FridgeItemResponse;
import com.hjs.foodshare.fridge.service.FridgeItemService;
import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.security.AuthUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/fridge/items")
public class FridgeItemController {

    private final FridgeItemService fridgeItemService;

    public FridgeItemController(FridgeItemService fridgeItemService) {
        this.fridgeItemService = fridgeItemService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<FridgeItemResponse>>> getItems(
            @AuthenticationPrincipal AuthUser authUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Fridge items found.", fridgeItemService.getItems(authUser.userId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<FridgeItemResponse>> createItem(
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody FridgeItemRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Fridge item created.", fridgeItemService.createItem(authUser.userId(), request)));
    }

    @PutMapping("/{itemId}")
    public ResponseEntity<ApiResponse<FridgeItemResponse>> updateItem(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long itemId,
            @Valid @RequestBody FridgeItemRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Fridge item updated.",
                fridgeItemService.updateItem(authUser.userId(), itemId, request)));
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<ApiResponse<Void>> deleteItem(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long itemId
    ) {
        fridgeItemService.deleteItem(authUser.userId(), itemId);
        return ResponseEntity.ok(ApiResponse.ok("Fridge item deleted.", null));
    }
}
