package com.hjs.foodshare.auth.service;

import com.hjs.foodshare.auth.domain.PhoneVerification;
import com.hjs.foodshare.auth.dto.PhoneVerificationSendRequest;
import com.hjs.foodshare.auth.dto.PhoneVerificationSendResponse;
import com.hjs.foodshare.auth.dto.PhoneVerificationVerifyRequest;
import com.hjs.foodshare.auth.dto.PhoneVerificationVerifyResponse;
import com.hjs.foodshare.auth.repository.PhoneVerificationRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PhoneVerificationService {

    private final PhoneVerificationRepository phoneVerificationRepository;
    private final SmsEmailInboxVerifier smsEmailInboxVerifier;
    private final SecureRandom secureRandom = new SecureRandom();
    private final String recipientEmail;
    private final Duration codeTtl;

    public PhoneVerificationService(
            PhoneVerificationRepository phoneVerificationRepository,
            SmsEmailInboxVerifier smsEmailInboxVerifier,
            @Value("${app.phone-verification.recipient-email:}") String recipientEmail,
            @Value("${app.phone-verification.expiration-millis:600000}") long expirationMillis
    ) {
        this.phoneVerificationRepository = phoneVerificationRepository;
        this.smsEmailInboxVerifier = smsEmailInboxVerifier;
        this.recipientEmail = recipientEmail;
        this.codeTtl = Duration.ofMillis(expirationMillis);
    }

    @Transactional
    public PhoneVerificationSendResponse start(PhoneVerificationSendRequest request) {
        if (recipientEmail == null || recipientEmail.isBlank()) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Phone verification recipient email is not configured.");
        }
        String phoneNumber = normalizePhone(request.phoneNumber());
        String code = createCode();
        String message = "FoodShare phone verification: " + code;
        PhoneVerification verification = PhoneVerification.create(phoneNumber, code, LocalDateTime.now().plus(codeTtl));
        phoneVerificationRepository.save(verification);

        return new PhoneVerificationSendResponse(
                phoneNumber,
                (int) codeTtl.toSeconds(),
                code,
                message,
                recipientEmail,
                "sms:" + recipientEmail + "?body=" + URLEncoder.encode(message, StandardCharsets.UTF_8)
        );
    }

    @Transactional
    public PhoneVerificationVerifyResponse verify(PhoneVerificationVerifyRequest request) {
        String phoneNumber = normalizePhone(request.phoneNumber());
        PhoneVerification verification = phoneVerificationRepository.findFirstByPhoneNumberOrderByCreatedAtDesc(phoneNumber)
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST, "Phone verification is not found."));
        validateUsable(verification);

        String code = request.code() == null || request.code().isBlank() ? verification.getCode() : request.code().trim();
        String senderPhone = smsEmailInboxVerifier.findSenderPhoneByCode(code)
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST, "Verification SMS has not arrived yet."));

        if (!phoneNumber.endsWith(senderPhone) && !senderPhone.endsWith(phoneNumber)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Verification SMS sender does not match phone number.");
        }

        verification.verify();
        return new PhoneVerificationVerifyResponse(phoneNumber, true);
    }

    @Transactional
    public void consumeVerifiedPhone(String phoneNumber) {
        String normalizedPhone = normalizePhone(phoneNumber);
        PhoneVerification verification = phoneVerificationRepository
                .findFirstByPhoneNumberAndVerifiedTrueAndUsedFalseOrderByCreatedAtDesc(normalizedPhone)
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST, "Phone verification is required."));
        validateUsable(verification);
        verification.use();
    }

    private void validateUsable(PhoneVerification verification) {
        if (verification.isUsed() || verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Phone verification is expired.");
        }
    }

    private String normalizePhone(String phoneNumber) {
        String normalized = phoneNumber == null ? "" : phoneNumber.replaceAll("[^0-9]", "");
        if (normalized.isBlank()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "phoneNumber is required.");
        }
        return normalized;
    }

    private String createCode() {
        byte[] bytes = new byte[18];
        secureRandom.nextBytes(bytes);
        return "FS-" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
