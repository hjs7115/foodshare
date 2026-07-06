package com.hjs.foodshare.trade.controller;

import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.security.AuthUser;
import com.hjs.foodshare.trade.dto.TradeRequestResponse;
import com.hjs.foodshare.trade.service.TradeRequestService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class TradeRequestController {

    private final TradeRequestService tradeRequestService;

    public TradeRequestController(TradeRequestService tradeRequestService) {
        this.tradeRequestService = tradeRequestService;
    }

    @PostMapping("/posts/{postId}/requests")
    public ResponseEntity<ApiResponse<TradeRequestResponse>> createRequest(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthUser authUser
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Trade request created.", tradeRequestService.createRequest(postId, authUser.userId())));
    }

    @PostMapping("/posts/{postId}/trade-requests")
    public ResponseEntity<ApiResponse<TradeRequestResponse>> createTradeRequest(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthUser authUser
    ) {
        return createRequest(postId, authUser);
    }

    @GetMapping("/posts/{postId}/trade-requests")
    public ResponseEntity<ApiResponse<List<TradeRequestResponse>>> getRequestsForPost(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthUser authUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Post trade requests found.",
                tradeRequestService.getRequestsForPost(postId, authUser.userId())));
    }

    @GetMapping("/trade-requests/me")
    public ResponseEntity<ApiResponse<List<TradeRequestResponse>>> getMyRequests(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(ApiResponse.ok("My trade requests found.", tradeRequestService.getMyRequests(authUser.userId())));
    }

    @GetMapping("/trade-requests/received")
    public ResponseEntity<ApiResponse<List<TradeRequestResponse>>> getReceivedRequests(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(ApiResponse.ok("Received trade requests found.", tradeRequestService.getReceivedRequests(authUser.userId())));
    }

    @RequestMapping(value = "/trade-requests/{requestId}/accept", method = {RequestMethod.POST, RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<TradeRequestResponse>> accept(
            @PathVariable Long requestId,
            @AuthenticationPrincipal AuthUser authUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Trade request accepted.", tradeRequestService.accept(requestId, authUser.userId())));
    }

    @RequestMapping(value = "/trade-requests/{requestId}/reject", method = {RequestMethod.POST, RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<TradeRequestResponse>> reject(
            @PathVariable Long requestId,
            @AuthenticationPrincipal AuthUser authUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Trade request rejected.", tradeRequestService.reject(requestId, authUser.userId())));
    }

    @RequestMapping(value = "/trade-requests/{requestId}/complete", method = {RequestMethod.POST, RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<TradeRequestResponse>> complete(
            @PathVariable Long requestId,
            @AuthenticationPrincipal AuthUser authUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Trade request completed.", tradeRequestService.complete(requestId, authUser.userId())));
    }

    @RequestMapping(value = "/posts/{postId}/group-buy/close-recruitment", method = {RequestMethod.POST, RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<List<TradeRequestResponse>>> closeGroupBuyRecruitment(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthUser authUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Group buy recruitment closed.",
                tradeRequestService.closeGroupBuyRecruitment(postId, authUser.userId())));
    }
}
