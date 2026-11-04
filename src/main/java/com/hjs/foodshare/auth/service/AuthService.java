package com.hjs.foodshare.auth.service;

import com.hjs.foodshare.auth.dto.AuthResponse;
import com.hjs.foodshare.auth.dto.DuplicateCheckResponse;
import com.hjs.foodshare.auth.dto.FindIdRequest;
import com.hjs.foodshare.auth.dto.FindEmailRequest;
import com.hjs.foodshare.auth.dto.FindEmailResponse;
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
import com.hjs.foodshare.auth.domain.RefreshToken;
import com.hjs.foodshare.auth.repository.RefreshTokenRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.global.security.JwtTokenProvider;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AuthService {

    @org.springframework.beans.factory.annotation.Autowired private AuthThrottle throttle;
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager em;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final EmailVerificationService emailVerificationService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, VerificationCode> phoneVerificationCodes = new ConcurrentHashMap<>();

    private static final Duration PHONE_CODE_TTL = Duration.ofMinutes(3);
    private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(14);

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            EmailVerificationService emailVerificationService,
            RefreshTokenRepository refreshTokenRepository
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.emailVerificationService = emailVerificationService;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        if (!Boolean.TRUE.equals(request.termsAccepted()) || !Boolean.TRUE.equals(request.privacyAccepted()) || !Boolean.TRUE.equals(request.apiAccepted()) || !"2026-11-04".equals(request.termsVersion()))
            throw new BusinessException(HttpStatus.BAD_REQUEST,"현재 필수 약관에 모두 동의해주세요.");
        validateDuplicateUser(request);
        emailVerificationService.consumeVerifiedEmail(request.email());

        User user = User.create(
                request.name(),
                request.nickname(),
                request.email(),
                passwordEncoder.encode(request.password()),
                request.phoneNumber(),
                request.location()
        );

        user.recordConsent(request.termsVersion());
        user.updateLocation(request.location(), request.latitude(), request.longitude());
        User savedUser = userRepository.save(user);
        return createAuthResponse(savedUser);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        var attributes=org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
        String remote=attributes instanceof org.springframework.web.context.request.ServletRequestAttributes servlet?servlet.getRequest().getRemoteAddr():"service";
        String attemptKey=request.email().trim().toLowerCase(java.util.Locale.ROOT)+"|"+remote;
        throttle.requireAvailable("login-failed",attemptKey,10);
        throttle.requireAvailable("login-ip",remote,200);
        User user = userRepository.findByEmail(request.email().trim().toLowerCase(java.util.Locale.ROOT)).orElse(null);
        if (user==null || !user.isAvailable() || !passwordEncoder.matches(request.password(),user.getPassword())) {
            throttle.check("login-ip",remote,200,900);
            throttle.check("login-failed",attemptKey,10,900);
            throw new BusinessException(HttpStatus.UNAUTHORIZED,"이메일 또는 비밀번호를 확인해주세요.");
        }

        return createAuthResponse(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        var previous=refreshTokenRepository.findByToken(request.refreshToken()).orElseThrow(()->new BusinessException(HttpStatus.UNAUTHORIZED,"세션이 종료되었습니다."));
        em.find(User.class,previous.getUser().getId(),jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        RefreshToken refreshToken = refreshTokenRepository.lockToken(request.refreshToken())
                .orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "Refresh token is invalid."));
        em.refresh(refreshToken,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (!refreshToken.isValid() || !refreshToken.getUser().isAvailable()) {
            refreshToken.revoke();
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "Refresh token is expired or revoked.");
        }
        refreshToken.revoke();
        return createAuthResponse(refreshToken.getUser());
    }

    @Transactional
    public void logout(Long userId) {
        User user=em.find(User.class,userId,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if(user!=null)user.revokeSessions();
        refreshTokenRepository.deleteAllByUserId(userId);
    }

    @Transactional
    public void logoutDevice(Long userId, String token) {
        if (token == null || token.isBlank()) return;
        em.find(User.class,userId,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        refreshTokenRepository.lockToken(token).filter(t -> t.getUser().getId().equals(userId)).ifPresent(RefreshToken::revoke);
    }

    public FindEmailResponse findEmail(FindEmailRequest request) {
        throw new BusinessException(HttpStatus.BAD_REQUEST,"인증되지 않은 전화번호로는 계정을 찾을 수 없습니다. 가입한 이메일을 이용해주세요.");
    }

    public FindEmailResponse findId(FindIdRequest request) {
        User user = userRepository.findByNameAndEmail(request.name(), request.email())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));

        return new FindEmailResponse(user.getEmail());
    }

    public DuplicateCheckResponse checkNickname(String nickname) {
        return DuplicateCheckResponse.from(userRepository.existsByNickname(nickname));
    }

    public DuplicateCheckResponse checkEmail(String email) {
        return DuplicateCheckResponse.from(userRepository.existsByEmail(email));
    }

    public DuplicateCheckResponse checkPhoneNumber(String phoneNumber) {
        return DuplicateCheckResponse.from(userRepository.existsByPhoneNumber(phoneNumber));
    }

    public PhoneVerificationSendResponse sendPhoneVerificationCode(PhoneVerificationSendRequest request) {
        throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE,"전화번호 본인 인증은 현재 제공하지 않습니다. 이메일 인증을 이용해주세요.");
    }

    public PhoneVerificationVerifyResponse verifyPhoneCode(PhoneVerificationVerifyRequest request) {
        throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE,"전화번호 본인 인증은 현재 제공하지 않습니다.");
    }

    @Transactional
    public PasswordResetLinkResponse requestPasswordResetLink(PasswordResetLinkRequest request) {
        var response = emailVerificationService.sendPasswordResetCode(request.email());
        return new PasswordResetLinkResponse(response.email(), response.expiresInSeconds());
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        emailVerificationService.consumePasswordResetCode(request.email(), request.code());

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));

        em.refresh(user,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        user.changePassword(passwordEncoder.encode(request.newPassword()));
        user.revokeSessions();
        refreshTokenRepository.deleteAllByUserId(user.getId());
    }

    private void validateDuplicateUser(SignupRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException(HttpStatus.CONFLICT, "Email already exists.");
        }
        if (userRepository.existsByNickname(request.nickname())) {
            throw new BusinessException(HttpStatus.CONFLICT, "Nickname already exists.");
        }

    }

    private AuthResponse createAuthResponse(User user) {
        em.refresh(user,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if(!user.isAvailable())throw new BusinessException(HttpStatus.UNAUTHORIZED,"이용할 수 없는 계정입니다.");
        String refreshToken = createOpaqueRefreshToken();
        RefreshToken session=refreshTokenRepository.saveAndFlush(RefreshToken.create(
                user,
                refreshToken,
                LocalDateTime.now().plus(REFRESH_TOKEN_TTL)
        ));
        return AuthResponse.of(jwtTokenProvider.createAccessToken(user,session.getId()), refreshToken, user);
    }

    private String createOpaqueRefreshToken() {
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private record VerificationCode(String code, Instant expiresAt) {
    }
}
