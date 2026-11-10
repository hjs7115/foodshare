package com.hjs.foodshare;

import com.hjs.foodshare.auth.service.AuthThrottle;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.global.security.AuthUser;
import com.hjs.foodshare.support.SupportInquiryController;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SupportInquiryTests {
    @Test void sendsToConfiguredInboxWithAuthenticatedUsersReplyTo() {
        var users = mock(UserRepository.class);
        var mail = mock(JavaMailSender.class);
        var throttle = mock(AuthThrottle.class);
        var customer = User.create("신청자", "동네이웃", "customer@example.com",
                "unused", "01000000000", "서울");
        when(users.findById(7L)).thenReturn(Optional.of(customer));
        var controller = new SupportInquiryController(users, mail, throttle,
                "support@example.com", "sender@example.com");
        var response = controller.submit(new AuthUser(7L, "customer@example.com", "동네이웃"),
                new SupportInquiryController.InquiryRequest(
                        SupportInquiryController.Category.ERROR,
                        "채팅 문제", "채팅이 자꾸 멈춰서 확인 부탁드립니다."));
        assertTrue(response.success());
        var capture = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(capture.capture());
        assertArrayEquals(new String[]{"support@example.com"}, capture.getValue().getTo());
        assertEquals("customer@example.com", capture.getValue().getReplyTo());
        assertTrue(capture.getValue().getText().contains("채팅이 자꾸 멈춰서"));
    }

    @Test void missingInboxNeverPretendsThatMailWasDelivered() {
        var mail = mock(JavaMailSender.class);
        var controller = new SupportInquiryController(mock(UserRepository.class), mail,
                mock(AuthThrottle.class), "", "sender@example.com");
        assertThrows(BusinessException.class, () -> controller.submit(
                new AuthUser(7L, "customer@example.com", "동네이웃"),
                new SupportInquiryController.InquiryRequest(
                        SupportInquiryController.Category.OTHER, "문의 제목",
                        "문의 내용이 열 글자를 넘습니다.")));
        verifyNoInteractions(mail);
    }
}
