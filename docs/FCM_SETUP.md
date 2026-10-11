# Firebase Cloud Messaging setup

The web client uses Firebase Messaging to obtain a registration token. The Spring Boot server sends data messages through the Firebase Admin SDK. Each browser/device token is stored as an individual row in `user_fcm_tokens`.

1. Configure a Firebase project with Cloud Messaging enabled and register the web app.
2. Configure the public web app values (`VITE_FIREBASE_*`) and the Web Push certificate key (`VITE_FIREBASE_VAPID_KEY`) in the frontend build environment. Firebase web config and the VAPID public key are client-visible values.
3. Create a Firebase service-account key with permission to send FCM messages. Keep its JSON file outside source control and mount it into the backend container.
4. Set `APP_FIREBASE_SERVICE_ACCOUNT` to the mounted path. Use Application Default Credentials in deployments where they are available, or mount the service-account JSON file.
5. Build and deploy both frontend and backend, then use **알림 설정 → 알림 연결** on each browser/device. The browser permission prompt is requested only from that button.

The backend removes a token only when FCM reports it as unregistered. Temporary delivery failures retain the token for later notifications. A user can register several browser/device tokens at the same time.
