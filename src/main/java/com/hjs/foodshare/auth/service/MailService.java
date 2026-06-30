package com.hjs.foodshare.auth.service;

import com.hjs.foodshare.global.exception.BusinessException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;

    public MailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendEmail(String from, String to, String subject, String text) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setReplyTo(from);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            mailSender.send(message);
            log.info("Email sent to {}", to);
        } catch (MailException exception) {
            log.error("Failed to send email to {}", to, exception);
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to send email.");
        }
    }

    public void sendHtmlEmail(String from, String to, String subject, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from);
            helper.setReplyTo(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            log.info("Email sent to {}", to);
        } catch (MessagingException | MailException exception) {
            log.error("Failed to send email to {}", to, exception);
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to send email.");
        }
    }
}
