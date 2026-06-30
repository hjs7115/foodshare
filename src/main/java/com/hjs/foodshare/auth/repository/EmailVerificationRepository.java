package com.hjs.foodshare.auth.repository;

import com.hjs.foodshare.auth.domain.EmailVerification;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    Optional<EmailVerification> findFirstByEmailOrderByCreatedAtDesc(String email);

    Optional<EmailVerification> findFirstByEmailAndVerifiedTrueAndUsedFalseOrderByCreatedAtDesc(String email);
}
