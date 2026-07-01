package com.hjs.foodshare.notification.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class FcmPushService {

    private static final Logger log = LoggerFactory.getLogger(FcmPushService.class);

    public boolean sendPush(String token, String title, String body) {
        if (token == null || token.isBlank() || FirebaseApp.getApps().isEmpty()) {
            return false;
        }

        Message message = Message.builder()
                .setToken(token)
                .setNotification(Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build())
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
