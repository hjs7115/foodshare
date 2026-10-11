# Web Push setup

The app uses the browser-standard Push API and Web Push protocol. This supports browsers such as Chrome, Edge, Firefox, and Safari without relying on Firebase Messaging.

1. Generate a VAPID key pair once by running `npx --yes web-push generate-vapid-keys`. The command prints a public/private pair.
2. Set the generated public key in `APP_WEB_PUSH_PUBLIC_KEY` and the private key in `APP_WEB_PUSH_PRIVATE_KEY` in the backend environment. Set `APP_WEB_PUSH_SUBJECT` to a valid `mailto:` contact or HTTPS URL.
3. Keep the key pair unchanged after users subscribe. The backend returns the public key to the client when it subscribes.
4. Restart the backend, rebuild/redeploy the frontend if applicable, and install/update the PWA in each browser. Open **설정 → 알림 설정 → 이 기기 푸시 알림 허용** in each browser to grant permission and save that browser's subscription. Use **이 기기 푸시 테스트** to confirm delivery.

For iPhone and iPad, install the site as a Home Screen web app before requesting permission. Apple requires a Home Screen web app for Web Push on iOS/iPadOS.

Subscriptions are per browser installation. Each device/browser needs to subscribe separately. Push delivery also requires HTTPS in deployed environments (localhost is allowed for development).
