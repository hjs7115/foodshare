package com.hjs.foodshare.notification.repository;

import com.hjs.foodshare.notification.domain.UserFcmToken;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserFcmTokenRepository extends JpaRepository<UserFcmToken, Long> {
    List<UserFcmToken> findAllByUser_Id(Long userId);
    Optional<UserFcmToken> findByToken(String token);
    void deleteByTokenAndUser_Id(String token, Long userId);
}
