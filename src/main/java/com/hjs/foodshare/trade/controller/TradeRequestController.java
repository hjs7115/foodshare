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
import org.springframework.web.bind.annotation.RequestBody;
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

    @org.springframework.web.bind.annotation.DeleteMapping("/trade-requests/history")
    public ResponseEntity<ApiResponse<Void>> hideHistory(
            @org.springframework.web.bind.annotation.RequestBody List<Long> requestIds,
            @AuthenticationPrincipal AuthUser authUser) {
        tradeRequestService.hideHistory(requestIds, authUser.userId());
        return ResponseEntity.ok(ApiResponse.ok("Trade history deleted.", null));
    }

    public record CancelRequest(@jakarta.validation.constraints.NotBlank String reason) {}
    public record ReopenRequest(boolean confirmed) {}
    public record ReopenGroupRequest(boolean notOrdered, java.time.LocalDateTime deadline) {}

    @PostMapping("/posts/{postId}/group-buy/reopen")
    public Object reopenGroup(@PathVariable Long postId, @AuthenticationPrincipal AuthUser user,
            @RequestBody ReopenGroupRequest request) {
        tradeRequestService.reopenGroupBuy(postId, user.userId(), request.notOrdered(), request.deadline());
        return ApiResponse.ok("빈자리 모집을 다시 시작했습니다.", null);
    }

    @PostMapping("/trade-requests/{requestId}/cancel")
    public ResponseEntity<ApiResponse<TradeRequestResponse>> cancel(
            @PathVariable Long requestId, @AuthenticationPrincipal AuthUser authUser,
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody CancelRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("거래가 취소되었습니다.", tradeRequestService.cancelMarketTrade(requestId,authUser.userId(),request.reason())));
    }

    @PostMapping("/trade-requests/{requestId}/reopen")
    public ResponseEntity<ApiResponse<TradeRequestResponse>> reopen(
            @PathVariable Long requestId, @AuthenticationPrincipal AuthUser authUser,
            @org.springframework.web.bind.annotation.RequestBody ReopenRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("다시 모집합니다.", tradeRequestService.reopenMarketTrade(requestId,authUser.userId(),request.confirmed())));
    }

    @PostMapping("/trade-requests/{requestId}/withdraw")
    public ApiResponse<TradeRequestResponse> withdraw(
            @PathVariable Long requestId, @AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("요청을 취소했습니다.", tradeRequestService.withdrawTradeRequest(requestId, user.userId()));
    }

    @PostMapping("/posts/{postId}/cancel-trades")
    public ResponseEntity<ApiResponse<Void>> cancelPost(@PathVariable Long postId,@AuthenticationPrincipal AuthUser user,
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody CancelRequest request) {
        tradeRequestService.cancelPostTrades(postId,user.userId(),request.reason());
        return ResponseEntity.ok(ApiResponse.ok("전체 거래를 취소했습니다.",null));
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

    @GetMapping("/posts/{postId}/my-request")
    public Object ownPostRequest(@PathVariable Long postId,@AuthenticationPrincipal AuthUser user){return ApiResponse.ok("내 요청",tradeRequestService.getMyRequestForPost(user.userId(),postId));}

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
