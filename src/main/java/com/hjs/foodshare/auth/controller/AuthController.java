package com.hjs.foodshare.auth.controller;

import com.hjs.foodshare.auth.dto.AuthResponse;
import com.hjs.foodshare.auth.dto.DuplicateCheckResponse;
import com.hjs.foodshare.auth.dto.EmailVerificationSendRequest;
import com.hjs.foodshare.auth.dto.EmailVerificationSendResponse;
import com.hjs.foodshare.auth.dto.EmailVerificationVerifyRequest;
import com.hjs.foodshare.auth.dto.EmailVerificationVerifyResponse;
import com.hjs.foodshare.auth.dto.FindEmailRequest;
import com.hjs.foodshare.auth.dto.FindEmailResponse;
import com.hjs.foodshare.auth.dto.FindIdRequest;
import com.hjs.foodshare.auth.dto.LoginRequest;
import com.hjs.foodshare.auth.dto.PasswordResetLinkRequest;
import com.hjs.foodshare.auth.dto.PasswordResetLinkResponse;
import com.hjs.foodshare.auth.dto.PhoneVerificationSendRequest;
import com.hjs.foodshare.auth.dto.PhoneVerificationSendResponse;
import com.hjs.foodshare.auth.dto.PhoneVerificationVerifyRequest;
import com.hjs.foodshare.auth.dto.PhoneVerificationVerifyResponse;
import com.hjs.foodshare.auth.dto.RefreshTokenRequest;
import com.hjs.foodshare.auth.dto.ResetPasswordRequest;
import com.hjs.foodshare.auth.dto.SignupRequest;
import com.hjs.foodshare.auth.service.AuthService;
import com.hjs.foodshare.auth.service.EmailVerificationService;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.security.AuthUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final EmailVerificationService emailVerificationService;

    public AuthController(AuthService authService, EmailVerificationService emailVerificationService) {
        this.authService = authService;
        this.emailVerificationService = emailVerificationService;
    }

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<AuthResponse>> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Signup completed.", authService.signup(request)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Login completed.", authService.login(request)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@AuthenticationPrincipal AuthUser authUser) {
        if (authUser != null) {
            authService.logout(authUser.userId());
        }
        return ResponseEntity.ok(ApiResponse.ok("Logout completed.", null));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Token refreshed.", authService.refresh(request)));
    }

    @PostMapping("/find-email")
    public ResponseEntity<ApiResponse<FindEmailResponse>> findEmail(@Valid @RequestBody FindEmailRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Email found.", authService.findEmail(request)));
    }

    @PostMapping("/find-id")
    public ResponseEntity<ApiResponse<FindEmailResponse>> findId(@Valid @RequestBody FindIdRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("ID found.", authService.findId(request)));
    }

    @GetMapping("/nickname/check")
    public ResponseEntity<ApiResponse<DuplicateCheckResponse>> checkNickname(@RequestParam String nickname) {
        return ResponseEntity.ok(ApiResponse.ok("Nickname checked.", authService.checkNickname(nickname)));
    }

    @GetMapping("/email/check")
    public ResponseEntity<ApiResponse<DuplicateCheckResponse>> checkEmail(@RequestParam String email) {
        return ResponseEntity.ok(ApiResponse.ok("Email checked.", authService.checkEmail(email)));
    }

    @GetMapping("/phone/check")
    public ResponseEntity<ApiResponse<DuplicateCheckResponse>> checkPhoneNumber(
            @RequestParam(required = false) String phoneNumber,
            @RequestParam(required = false) String phone
    ) {
        String normalizedPhoneNumber = phoneNumber != null ? phoneNumber : phone;
        if (normalizedPhoneNumber == null || normalizedPhoneNumber.isBlank()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "phoneNumber is required.");
        }
        return ResponseEntity.ok(ApiResponse.ok("Phone number checked.", authService.checkPhoneNumber(normalizedPhoneNumber)));
    }

    @PostMapping("/email-verifications")
    public ResponseEntity<ApiResponse<EmailVerificationSendResponse>> sendEmailVerificationCode(
            @Valid @RequestBody EmailVerificationSendRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Email verification code sent.", emailVerificationService.sendCode(request)));
    }

    @PostMapping("/email-verifications/verify")
    public ResponseEntity<ApiResponse<EmailVerificationVerifyResponse>> verifyEmailCode(
            @Valid @RequestBody EmailVerificationVerifyRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Email verified.", emailVerificationService.verifyCode(request)));
    }

    @PostMapping("/phone-verifications")
    public ResponseEntity<ApiResponse<PhoneVerificationSendResponse>> sendPhoneVerificationCode(
            @Valid @RequestBody PhoneVerificationSendRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Phone verification code sent.", authService.sendPhoneVerificationCode(request)));
    }

    @PostMapping("/phone-verifications/verify")
    public ResponseEntity<ApiResponse<PhoneVerificationVerifyResponse>> verifyPhoneCode(
            @Valid @RequestBody PhoneVerificationVerifyRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Phone verified.", authService.verifyPhoneCode(request)));
    }

    @PostMapping("/password-reset-link")
    public ResponseEntity<ApiResponse<PasswordResetLinkResponse>> requestPasswordResetLink(
            @Valid @RequestBody PasswordResetLinkRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Password reset link created.", authService.requestPasswordResetLink(request)));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.ok("Password reset completed.", null));
    }
}
