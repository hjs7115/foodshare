package com.hjs.foodshare.auth.service;

import com.hjs.foodshare.auth.domain.EmailVerification;
import com.hjs.foodshare.auth.dto.EmailVerificationSendRequest;
import com.hjs.foodshare.auth.dto.EmailVerificationSendResponse;
import com.hjs.foodshare.auth.dto.EmailVerificationVerifyRequest;
import com.hjs.foodshare.auth.dto.EmailVerificationVerifyResponse;
import com.hjs.foodshare.auth.repository.EmailVerificationRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.user.repository.UserRepository;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class EmailVerificationService {

    private static final int AUTH_CODE_LENGTH = 6;

    private final EmailVerificationRepository emailVerificationRepository;
    private final UserRepository userRepository;
    private final MailService mailService;
    private final SecureRandom secureRandom = new SecureRandom();
    private final String fromAddress;
    private final Duration codeTtl;

    public EmailVerificationService(
            EmailVerificationRepository emailVerificationRepository,
            UserRepository userRepository,
            MailService mailService,
            @Value("${app.mail.from:${spring.mail.username:no-reply@foodshare.local}}") String fromAddress,
            @Value("${spring.mail.auth-code-expiration-millis}") long authCodeExpirationMillis
    ) {
        this.emailVerificationRepository = emailVerificationRepository;
        this.userRepository = userRepository;
        this.mailService = mailService;
        this.fromAddress = fromAddress;
        this.codeTtl = Duration.ofMillis(authCodeExpirationMillis);
    }

    @Transactional
    public EmailVerificationSendResponse sendCode(EmailVerificationSendRequest request) {
        String email = request.email().trim();

        checkDuplicatedEmail(email);

        EmailVerification verification = createAndSendCode(
                email,
                "FoodShare email verification",
                "Enter this verification code on the signup screen.",
                "[FoodShare] Email verification code"
        );

        return new EmailVerificationSendResponse(verification.getEmail(), (int) codeTtl.toSeconds());
    }

    @Transactional
    public EmailVerificationSendResponse sendPasswordResetCode(String email) {
        String normalizedEmail = email.trim();

        if (!userRepository.existsByEmail(normalizedEmail)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "User not found.");
        }

        EmailVerification verification = createAndSendCode(
                normalizedEmail,
                "FoodShare password reset",
                "Enter this verification code on the password reset screen.",
                "[FoodShare] Password reset code"
        );

        return new EmailVerificationSendResponse(verification.getEmail(), (int) codeTtl.toSeconds());
    }

    @Transactional
    public EmailVerificationSendResponse sendAccountRecoveryCode(String email) {
        String normalizedEmail = email.trim();

        EmailVerification verification = createAndSendCode(
                normalizedEmail,
                "FoodShare account recovery",
                "Enter this verification code on the account recovery screen.",
                "[FoodShare] Account recovery code"
        );

        return new EmailVerificationSendResponse(verification.getEmail(), (int) codeTtl.toSeconds());
    }

    private EmailVerification createAndSendCode(String email, String title, String description, String subject) {
        String code = createCode();
        EmailVerification verification = EmailVerification.create(
                email,
                code,
                LocalDateTime.now().plus(codeTtl)
        );
        emailVerificationRepository.save(verification);

        sendVerificationMail(email, code, title, description, subject);

        return verification;
    }

    @Transactional
    public EmailVerificationVerifyResponse verifyCode(EmailVerificationVerifyRequest request) {
        String email = request.email().trim();
        String code = request.code().trim();

        EmailVerification verification = emailVerificationRepository.findFirstByEmailOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST, "Verification code is not found."));

        if (verification.isUsed() || verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Verification code is expired.");
        }
        if (!verification.getCode().equals(code)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Verification code is invalid.");
        }

        verification.verify();
        return new EmailVerificationVerifyResponse(email, true);
    }

    @Transactional
    public void consumeVerifiedEmail(String email) {
        EmailVerification verification = emailVerificationRepository
                .findFirstByEmailAndVerifiedTrueAndUsedFalseOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST, "Email verification is required."));

        if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Email verification is expired.");
        }

        verification.use();
    }

    @Transactional
    public void consumePasswordResetCode(String email, String code) {
        String normalizedEmail = email.trim();
        String normalizedCode = code.trim();

        EmailVerification verification = emailVerificationRepository.findFirstByEmailOrderByCreatedAtDesc(normalizedEmail)
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST, "Verification code is not found."));

        if (verification.isUsed() || verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Verification code is expired.");
        }
        if (!verification.getCode().equals(normalizedCode)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Verification code is invalid.");
        }

        verification.verify();
        verification.use();
    }

    private void sendVerificationMail(String email, String code, String title, String description, String subject) {
        String html = """
                <div style="font-family:Arial,sans-serif;line-height:1.6">
                  <h2>%s</h2>
                  <p>%s</p>
                  <p style="font-size:28px;font-weight:700;letter-spacing:4px">%s</p>
                  <p>This code expires in %d minutes.</p>
                </div>
                """.formatted(title, description, code, codeTtl.toMinutes());

        mailService.sendHtmlEmail(fromAddress, email, subject, html);
    }

    private void checkDuplicatedEmail(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException(HttpStatus.CONFLICT, "Email already exists.");
        }
    }

    private String createCode() {
        StringBuilder builder = new StringBuilder(AUTH_CODE_LENGTH);
        for (int i = 0; i < AUTH_CODE_LENGTH; i++) {
            builder.append(secureRandom.nextInt(10));
        }
        return builder.toString();
    }
}
