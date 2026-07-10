package com.hjs.foodshare.global.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.hjs.foodshare.global.exception.BusinessException;
import java.io.IOException;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final List<String> PUBLIC_AUTH_PATHS = List.of(
            "/api/auth/signup",
            "/api/auth/login",
            "/api/auth/refresh",
            "/api/auth/find-email",
            "/api/auth/find-id",
            "/api/auth/nickname/check",
            "/api/auth/email/check",
            "/api/auth/phone/check",
            "/api/auth/email-verifications",
            "/api/auth/email-verifications/verify",
            "/api/auth/phone-verifications",
            "/api/auth/phone-verifications/verify",
            "/api/auth/password-reset-link",
            "/api/auth/reset-password"
    );

    private final JwtTokenProvider jwtTokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);

        try {
            String token = extractBearerToken(authorization);
            if (token != null) {
                AuthUser authUser = jwtTokenProvider.parseAuthUser(token);
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        authUser,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_USER"))
                );
                SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
                securityContext.setAuthentication(authentication);
                SecurityContextHolder.setContext(securityContext);
                SecurityContextHolder.setDeferredContext(() -> securityContext);
            }
        } catch (BusinessException exception) {
            SecurityContextHolder.clearContext();
            if (isOptionalAuthenticationEndpoint(request)) {
                filterChain.doFilter(request, response);
                return;
            }
            response.setStatus(exception.getStatus().value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"success\":false,\"message\":\"" + exception.getMessage() + "\",\"data\":null}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();
        return path.startsWith("/uploads/")
                || path.equals("/error")
                || PUBLIC_AUTH_PATHS.stream().anyMatch(path::equals);
    }

    private boolean isOptionalAuthenticationEndpoint(HttpServletRequest request) {
        if (!"GET".equalsIgnoreCase(request.getMethod())) {
            return false;
        }

        String path = request.getRequestURI();
        return path.equals("/")
                || path.equals("/api/posts")
                || path.matches("^/api/posts/\\d+$")
                || path.matches("^/api/posts/\\d+/comments$")
                || path.matches("^/api/posts/\\d+/comments/page$")
                || path.matches("^/api/users/\\d+/reviews$")
                || path.matches("^/api/users/\\d+/rating$")
                || path.startsWith("/uploads/");
    }

    private String extractBearerToken(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            return null;
        }

        String token = authorization.trim();
        while (token.toLowerCase(Locale.ROOT).startsWith(BEARER_PREFIX.toLowerCase(Locale.ROOT))) {
            token = token.substring(BEARER_PREFIX.length()).trim();
        }

        if ((token.startsWith("\"") && token.endsWith("\"")) || (token.startsWith("'") && token.endsWith("'"))) {
            token = token.substring(1, token.length() - 1).trim();
        }

        return token.isBlank() ? null : token;
    }
}
