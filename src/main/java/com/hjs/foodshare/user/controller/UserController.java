package com.hjs.foodshare.user.controller;

import com.hjs.foodshare.auth.dto.DuplicateCheckResponse;
import com.hjs.foodshare.auth.service.AuthService;
import com.hjs.foodshare.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final AuthService authService;

    public UserController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/check-nickname")
    public ResponseEntity<ApiResponse<DuplicateCheckResponse>> checkNickname(@RequestParam String nickname) {
        return ResponseEntity.ok(ApiResponse.ok("Nickname checked.", authService.checkNickname(nickname)));
    }

}
