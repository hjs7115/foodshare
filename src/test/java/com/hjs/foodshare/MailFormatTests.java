package com.hjs.foodshare;

import com.hjs.foodshare.auth.service.MailService;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MailFormatTests {
    private String body(Part part, String type) throws Exception {
        if (part.isMimeType(type)) return (String) part.getContent();
        if (part.getContent() instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                String match = body(multipart.getBodyPart(i), type);
                if (match != null) return match;
            }
        }
        return null;
    }
    @Test void verificationMailIncludesPlainTextHtmlAndHonestSender() throws Exception {
        JavaMailSender sender = mock(JavaMailSender.class);
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        when(sender.createMimeMessage()).thenReturn(message);
        new MailService(sender).sendHtmlEmail("sender@example.com", "recipient@example.com", "[반띵] 이메일 인증코드", "인증코드: 123456", "<p>인증코드: <b>123456</b></p>");
        message.saveChanges();
        assertEquals("인증코드: 123456", body(message, "text/plain"));
        assertEquals("<p>인증코드: <b>123456</b></p>", body(message, "text/html"));
        InternetAddress from = (InternetAddress) message.getFrom()[0];
        assertEquals("sender@example.com", from.getAddress());
        assertEquals("반띵", from.getPersonal());
        assertNotNull(message.getSentDate());
        assertEquals("auto-generated", message.getHeader("Auto-Submitted", null));
        verify(sender).send(message);
    }
}
