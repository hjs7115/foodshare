package com.hjs.foodshare.global.security;

import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.user.domain.User;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {

    private static final String HMAC_SHA256 = "HmacSHA256";
    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();
    private static final Pattern JSON_FIELD_PATTERN = Pattern.compile("\"([^\"]+)\":(\"([^\"]*)\"|[0-9]+)");

    private final byte[] secretKey;
    private final long expirationSeconds;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-seconds}") long expirationSeconds
    ) {
        this.secretKey = secret.getBytes(StandardCharsets.UTF_8);
        this.expirationSeconds = expirationSeconds;
    }

    public String createAccessToken(User user) {
        Instant now = Instant.now();
        String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String payload = "{"
                + "\"sub\":\"" + escapeJson(user.getId().toString()) + "\","
                + "\"email\":\"" + escapeJson(user.getEmail()) + "\","
                + "\"nickname\":\"" + escapeJson(user.getNickname()) + "\","
                + "\"iat\":" + now.getEpochSecond() + ","
                + "\"exp\":" + now.plusSeconds(expirationSeconds).getEpochSecond()
                + "}";

        String encodedHeader = encode(header);
        String encodedPayload = encode(payload);
        String content = encodedHeader + "." + encodedPayload;

        return content + "." + sign(content);
    }

    public AuthUser parseAuthUser(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다.");
        }

        String content = parts[0] + "." + parts[1];
        if (!constantTimeEquals(sign(content), parts[2])) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다.");
        }

        Map<String, String> payload = decodePayload(parts[1]);
        long expiration = Long.parseLong(payload.get("exp"));
        if (Instant.now().getEpochSecond() >= expiration) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "토큰이 만료되었습니다.");
        }

        return new AuthUser(
                Long.valueOf(payload.get("sub")),
                payload.get("email"),
                payload.get("nickname")
        );
    }

    private String encode(String value) {
        return BASE64_URL_ENCODER.encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private Map<String, String> decodePayload(String encodedPayload) {
        try {
            String json = new String(BASE64_URL_DECODER.decode(encodedPayload), StandardCharsets.UTF_8);
            Map<String, String> payload = new HashMap<>();
            Matcher matcher = JSON_FIELD_PATTERN.matcher(json);
            while (matcher.find()) {
                String value = matcher.group(3) != null ? matcher.group(3) : matcher.group(2);
                payload.put(matcher.group(1), unescapeJson(value));
            }
            return payload;
        } catch (Exception exception) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다.");
        }
    }

    private String sign(String content) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            mac.init(new SecretKeySpec(secretKey, HMAC_SHA256));
            return BASE64_URL_ENCODER.encodeToString(mac.doFinal(content.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("JWT 서명에 실패했습니다.", exception);
        }
    }

    private boolean constantTimeEquals(String left, String right) {
        byte[] leftBytes = left.getBytes(StandardCharsets.UTF_8);
        byte[] rightBytes = right.getBytes(StandardCharsets.UTF_8);
        if (leftBytes.length != rightBytes.length) {
            return false;
        }

        int result = 0;
        for (int i = 0; i < leftBytes.length; i++) {
            result |= leftBytes[i] ^ rightBytes[i];
        }
        return result == 0;
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String unescapeJson(String value) {
        return value.replace("\\\"", "\"").replace("\\\\", "\\");
    }
}
