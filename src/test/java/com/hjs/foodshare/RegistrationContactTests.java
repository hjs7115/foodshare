package com.hjs.foodshare;

import com.hjs.foodshare.auth.dto.*;
import com.hjs.foodshare.auth.repository.EmailVerificationRepository;
import com.hjs.foodshare.auth.service.AuthService;
import com.hjs.foodshare.auth.service.EmailVerificationService;
import com.hjs.foodshare.auth.service.MailService;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.notification.service.FcmPushService;
import com.hjs.foodshare.user.repository.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;

@SpringBootTest
@Transactional
class RegistrationContactTests {
    @Autowired AuthService auth;
    @Autowired EmailVerificationService emailVerification;
    @Autowired EmailVerificationRepository codes;
    @Autowired UserRepository users;
    @MockitoBean MailService mail;
    @MockitoBean FcmPushService push;

    private String email() { return UUID.randomUUID()+"@contact.test"; }

    private AuthResponse register(String email,String nickname,String phone) {
        emailVerification.sendCode(new EmailVerificationSendRequest(email));
        var code=codes.findFirstByEmailOrderByCreatedAtDesc(email).orElseThrow();
        emailVerification.verifyCode(new EmailVerificationVerifyRequest(email,code.getCode()));
        return auth.signup(new SignupRequest("연락처 사용자",nickname,email,"password1!",phone,"서울"));
    }

    @Test void emailCodeVerificationRegistersContactWithoutPhoneVerification() {
        String email=email();
        var response=register(email,"contact-signup","010-1234-5678");
        var saved=users.findById(response.user().userId()).orElseThrow();
        assertEquals(email,saved.getEmail());
        assertEquals("01012345678",saved.getPhoneNumber());
        assertTrue(codes.findFirstByEmailOrderByCreatedAtDesc(email).orElseThrow().isUsed());
        verify(mail).sendHtmlEmail(anyString(),eq(email),eq("[반띵] 이메일 인증코드"),anyString(),anyString());
    }

    @Test void duplicateContactNumberIsRejectedBeforeAnotherSignup() {
        register(email(),"contact-first","01012345678");
        var error=assertThrows(BusinessException.class,()->auth.signup(
                new SignupRequest("다른 사용자","contact-second",email(),"password1!","01012345678","서울")));
        assertEquals(HttpStatus.CONFLICT,error.getStatus());
        assertEquals("Phone number already exists.",error.getMessage());
    }

    @Test void registeredNameAndContactCanFindEmail() {
        String email=email();
        register(email,"contact-find","01012345678");
        assertEquals(email,auth.findEmail(new FindEmailRequest("연락처 사용자","01012345678")).email());
        assertEquals(HttpStatus.NOT_FOUND,assertThrows(BusinessException.class,()->
                auth.findEmail(new FindEmailRequest("다른 이름","01012345678"))).getStatus());
        assertEquals(HttpStatus.NOT_FOUND,assertThrows(BusinessException.class,()->
                auth.findEmail(new FindEmailRequest("연락처 사용자","01087654321"))).getStatus());
    }

    @Test void contactStorageDoesNotReplaceRequiredEmailVerification() {
        var error=assertThrows(BusinessException.class,()->auth.signup(
                new SignupRequest("연락처 사용자","contact-unverified",email(),"password1!","01012345678","서울")));
        assertEquals(HttpStatus.BAD_REQUEST,error.getStatus());
        assertTrue(error.getMessage().contains("Email verification"));
        assertFalse(users.existsByNickname("contact-unverified"));
    }
}
