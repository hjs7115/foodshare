package com.hjs.foodshare.user.repository;

import com.hjs.foodshare.user.domain.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByEmail(String email);

    boolean existsByNickname(String nickname);

    boolean existsByPhoneNumber(String phoneNumber);

    Optional<User> findByEmail(String email);

    Optional<User> findByNameAndEmail(String name, String email);

    Optional<User> findByNameAndPhoneNumber(String name, String phoneNumber);
}
