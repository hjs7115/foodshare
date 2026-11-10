package com.hjs.foodshare.support;

import com.hjs.foodshare.auth.service.AuthThrottle;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.global.security.AuthUser;
import com.hjs.foodshare.user.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/support/inquiries")
public class SupportInquiryController {
    private static final Logger log = LoggerFactory.getLogger(SupportInquiryController.class);
    private final UserRepository users;
    private final JavaMailSender mail;
    private final AuthThrottle throttle;
    private final String recipient;
    private final String sender;

    public SupportInquiryController(UserRepository users, JavaMailSender mail,
            AuthThrottle throttle,
            @Value("${app.support.inbox-email:}") String recipient,
            @Value("${app.mail.from:}") String sender) {
        this.users = users;
        this.mail = mail;
        this.throttle = throttle;
        this.recipient = recipient == null ? "" : recipient.strip();
        this.sender = sender == null ? "" : sender.strip();
    }

    public enum Category { ERROR, SUGGESTION, ACCOUNT, OTHER }

    public record InquiryRequest(
            @NotNull Category category,
            @NotBlank @Size(min=2, max=100) String title,
            @NotBlank @Size(min=10, max=3000) String content
    ) {}

    @PostMapping
    public ApiResponse<Void> submit(@AuthenticationPrincipal AuthUser auth,
            @Valid @RequestBody InquiryRequest request) {
        if (auth == null || auth.userId() == null)
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        if (recipient.isBlank() || sender.isBlank()) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE,
                    "현재 문의 이메일이 설정되지 않았습니다. 관리자에게 문의해주세요.");
        }
        var user = users.findById(auth.userId())
                .orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "계정을 찾지 못했습니다."));
        if (!user.isAvailable())
            throw new BusinessException(HttpStatus.FORBIDDEN, "사용할 수 없는 계정입니다.");

        // Account-scoped anti-spam limits; only successful authentication can call this API.
        throttle.check("support-hour", String.valueOf(user.getId()), 3, 3600);
        throttle.check("support-day", String.valueOf(user.getId()), 8, 86400);

        String subject = "[반띵 문의][" + request.category().name() + "] "
                + request.title().strip().replaceAll("[\\r\\n\\t]", " ");
        String body = "문의 분류: " + request.category().name()
                + "\n제목: " + request.title().strip()
                + "\n회원 번호: " + user.getId()
                + "\n닉네임: " + user.getNickname()
                + "\n답장 이메일: " + user.getEmail()
                + "\n\n문의 내용:\n" + request.content().strip();
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(sender);
            message.setReplyTo(user.getEmail());
            message.setTo(recipient);
            message.setSubject(subject);
            message.setText(body);
            mail.send(message);
            return ApiResponse.ok("문의 내용이 접수되어 이메일로 전달되었습니다.", null);
        } catch (MailException | IllegalArgumentException e) {
            log.warn("Support email delivery failed for user id {}: {}", user.getId(), e.toString());
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE,
                    "이메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
    }
}
