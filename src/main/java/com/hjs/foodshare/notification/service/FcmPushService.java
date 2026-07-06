package com.hjs.foodshare.notification.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class FcmPushService {

    private static final Logger log = LoggerFactory.getLogger(FcmPushService.class);

    public boolean sendPush(String token, String title, String body) {
        return sendPush(token, title, body, Map.of());
    }

    public boolean sendPush(String token, String title, String body, Map<String, String> data) {
        if (token == null || token.isBlank() || FirebaseApp.getApps().isEmpty()) {
            return false;
        }

        Map<String, String> pushData = new HashMap<>();
        pushData.put("title", title == null ? "" : title);
        pushData.put("body", body == null ? "" : body);
        if (data != null && !data.isEmpty()) {
            pushData.putAll(data);
        }

        Message message = Message.builder()
                .setToken(token)
                .putAllData(pushData)
                .build();

        try {
            FirebaseMessaging.getInstance().send(message);
            return true;
        } catch (Exception exception) {
            log.warn("FCM push failed: {}", exception.getMessage());
            return false;
        }
    }

    public boolean isEnabled() {
        return !FirebaseApp.getApps().isEmpty();
    }
}
