package com.hjs.foodshare.auth.repository;

import com.hjs.foodshare.auth.domain.PhoneVerification;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhoneVerificationRepository extends JpaRepository<PhoneVerification, Long> {

    Optional<PhoneVerification> findFirstByPhoneNumberOrderByCreatedAtDesc(String phoneNumber);

    Optional<PhoneVerification> findFirstByPhoneNumberAndVerifiedTrueAndUsedFalseOrderByCreatedAtDesc(String phoneNumber);
}
