package com.hjs.foodshare.notification.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class FcmPushService {

    private static final Logger log = LoggerFactory.getLogger(FcmPushService.class);

    public SendResult sendPush(String token, String title, String body, Map<String, String> data) {
        if (token == null || token.isBlank() || FirebaseApp.getApps().isEmpty()) return SendResult.DISABLED;

        Map<String, String> pushData = new HashMap<>();
        pushData.put("title", title == null ? "" : title);
        pushData.put("body", body == null ? "" : body);
        if (data != null) pushData.putAll(data);

        Message message = Message.builder()
                .setToken(token)
                .putAllData(pushData)
                .build();
        try {
            FirebaseMessaging.getInstance().send(message);
            return SendResult.SENT;
        } catch (FirebaseMessagingException exception) {
            if (exception.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED) {
                return SendResult.INVALID_TOKEN;
            }
            log.warn("FCM delivery failed with code {}: {}", exception.getMessagingErrorCode(), exception.getMessage());
            return SendResult.FAILED;
        } catch (RuntimeException exception) {
            log.warn("FCM delivery failed: {}", exception.getMessage());
            return SendResult.FAILED;
        }
    }

    public boolean isEnabled() {
        return !FirebaseApp.getApps().isEmpty();
    }

    public enum SendResult { SENT, INVALID_TOKEN, FAILED, DISABLED }
}
