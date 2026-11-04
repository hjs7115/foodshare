package com.hjs.foodshare.global.security;
public record AuthUser(Long userId,String email,String nickname,long version,Long sessionId) {
    public AuthUser(Long userId,String email,String nickname) { this(userId,email,nickname,0,null); }
}
