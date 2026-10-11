package com.hjs.foodshare.notification.service;

import com.hjs.foodshare.notification.domain.PushSubscription;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.util.concurrent.ExecutionException;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.jose4j.lang.JoseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class WebPushService {

    private static final Logger log = LoggerFactory.getLogger(WebPushService.class);
    private final String publicKey;
    private final PushService pushService;

    public WebPushService(
            @Value("${app.web-push.public-key:}") String publicKey,
            @Value("${app.web-push.private-key:}") String privateKey,
            @Value("${app.web-push.subject:mailto:admin@foodshare.local}") String subject
    ) {
        this.publicKey = publicKey == null ? "" : publicKey.trim();
        String normalizedPrivateKey = privateKey == null ? "" : privateKey.trim();
        if (this.publicKey.isEmpty() && normalizedPrivateKey.isEmpty()) {
            this.pushService = null;
            return;
        }
        if (this.publicKey.isEmpty() || normalizedPrivateKey.isEmpty()) {
            throw new IllegalStateException("Both Web Push VAPID keys must be configured together.");
        }

        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        try {
            this.pushService = new PushService(this.publicKey, normalizedPrivateKey, subject);
        } catch (Exception exception) {
            throw new IllegalStateException("The Web Push VAPID key pair is invalid.", exception);
        }
    }

    public String getPublicKey() {
        return publicKey;
    }

    public boolean isEnabled() {
        return pushService != null;
    }

    /** Returns the push service's HTTP status, or -1 when delivery failed locally. */
    public int send(PushSubscription subscription, String payload) {
        if (pushService == null) return 0;

        try {
            Notification notification = new Notification(
                    subscription.getEndpoint(),
                    subscription.getP256dh(),
                    subscription.getAuth(),
                    payload.getBytes(StandardCharsets.UTF_8),
                    60 * 60
            );
            HttpResponse response = pushService.send(notification);
            return response.getStatusLine().getStatusCode();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            log.warn("Web Push delivery was interrupted.");
            return -1;
        } catch (IOException | java.security.GeneralSecurityException | JoseException | ExecutionException exception) {
            log.warn("Web Push delivery failed: {}", exception.getMessage());
            return -1;
        }
    }
}
