package com.hjs.foodshare.auth.repository;

import com.hjs.foodshare.auth.domain.RefreshToken;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select t from RefreshToken t where t.token=:token")
    Optional<RefreshToken> lockToken(@org.springframework.data.repository.query.Param("token") String token);

    void deleteAllByUserId(Long userId);
}
