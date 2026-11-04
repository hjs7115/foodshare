package com.hjs.foodshare.auth.service;

import com.hjs.foodshare.auth.repository.RefreshTokenRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.global.security.AuthUser;
import com.hjs.foodshare.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly=true)
public class SessionAccessService {
    private final UserRepository users;
    private final RefreshTokenRepository tokens;
    public SessionAccessService(UserRepository users,RefreshTokenRepository tokens){this.users=users;this.tokens=tokens;}
    public void requireActive(AuthUser principal) {
        var user=users.findById(principal.userId()).orElseThrow(SessionAccessService::denied);
        if (!user.isAvailable() || user.getTokenVersion()!=principal.version()) throw denied();
        if (principal.sessionId()!=null && tokens.findById(principal.sessionId())
                .filter(t -> t.getUser().getId().equals(principal.userId()) && t.isValid()).isEmpty()) throw denied();
    }
    private static BusinessException denied(){return new BusinessException(HttpStatus.UNAUTHORIZED,"세션이 종료되었습니다. 다시 로그인해주세요.");}
}
