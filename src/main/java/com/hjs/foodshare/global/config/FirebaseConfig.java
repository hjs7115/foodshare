package com.hjs.foodshare.global.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    public FirebaseConfig(
            @Value("${app.firebase.enabled:true}") boolean enabled,
            @Value("${app.firebase.service-account:}") String serviceAccountPath
    ) {
        if (!enabled || !FirebaseApp.getApps().isEmpty()) return;
        try {
            GoogleCredentials credentials;
            if (serviceAccountPath == null || serviceAccountPath.isBlank()) {
                credentials = GoogleCredentials.getApplicationDefault();
            } else {
                try (InputStream serviceAccount = new FileInputStream(serviceAccountPath)) {
                    credentials = GoogleCredentials.fromStream(serviceAccount);
                }
            }
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(credentials)
                    .build();
            FirebaseApp.initializeApp(options);
        } catch (IOException exception) {
            log.warn("FCM is disabled because Firebase credentials are unavailable: {}", exception.getMessage());
        }
    }
}
