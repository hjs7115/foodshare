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
import com.hjs.foodshare.auth.dto.ResetPasswordRequest;
import com.hjs.foodshare.auth.dto.SignupRequest;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.global.security.JwtTokenProvider;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final EmailVerificationService emailVerificationService;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, VerificationCode> phoneVerificationCodes = new ConcurrentHashMap<>();

    private static final Duration PHONE_CODE_TTL = Duration.ofMinutes(3);
    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            EmailVerificationService emailVerificationService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.emailVerificationService = emailVerificationService;
    }

    @Transactional
    public AuthResponse signup(SignupRequest request) {
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

        User savedUser = userRepository.save(user);
        return AuthResponse.of(jwtTokenProvider.createAccessToken(savedUser), savedUser);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "Email or password is invalid."));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "Email or password is invalid.");
        }

        return AuthResponse.of(jwtTokenProvider.createAccessToken(user), user);
    }

    public FindEmailResponse findEmail(FindEmailRequest request) {
        User user = userRepository.findByNameAndPhoneNumber(request.name(), request.phoneNumber())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));

        return new FindEmailResponse(user.getEmail());
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
        String code = "%06d".formatted(secureRandom.nextInt(1_000_000));
        phoneVerificationCodes.put(request.phoneNumber(), new VerificationCode(code, Instant.now().plus(PHONE_CODE_TTL)));

        return new PhoneVerificationSendResponse(
                request.phoneNumber(),
                (int) PHONE_CODE_TTL.toSeconds(),
                code
        );
    }

    public PhoneVerificationVerifyResponse verifyPhoneCode(PhoneVerificationVerifyRequest request) {
        VerificationCode verificationCode = phoneVerificationCodes.get(request.phoneNumber());
        if (verificationCode == null || verificationCode.expiresAt().isBefore(Instant.now())) {
            phoneVerificationCodes.remove(request.phoneNumber());
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Verification code is expired or not found.");
        }
        if (!verificationCode.code().equals(request.code())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Verification code is invalid.");
        }

        phoneVerificationCodes.remove(request.phoneNumber());
        return new PhoneVerificationVerifyResponse(request.phoneNumber(), true);
    }

    public PasswordResetLinkResponse requestPasswordResetLink(PasswordResetLinkRequest request) {
        var response = emailVerificationService.sendPasswordResetCode(request.email());
        return new PasswordResetLinkResponse(response.email(), response.expiresInSeconds());
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        emailVerificationService.consumePasswordResetCode(request.email(), request.code());

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));

        user.changePassword(passwordEncoder.encode(request.newPassword()));
    }

    private void validateDuplicateUser(SignupRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException(HttpStatus.CONFLICT, "Email already exists.");
        }
        if (userRepository.existsByNickname(request.nickname())) {
            throw new BusinessException(HttpStatus.CONFLICT, "Nickname already exists.");
        }
        if (userRepository.existsByPhoneNumber(request.phoneNumber())) {
            throw new BusinessException(HttpStatus.CONFLICT, "Phone number already exists.");
        }
    }

    private record VerificationCode(String code, Instant expiresAt) {
    }
}
