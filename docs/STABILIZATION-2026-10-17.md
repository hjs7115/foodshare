# Stabilization, 2026-10-17

- Re-encode validated image uploads, enforce ownership on new attachments, and restrict legacy upload responses. Legacy/shared image files are retained rather than deleted unsafely; orphan cleanup is not implemented.
- Persist per-account authentication/email verification attempt limits; add production Nginx IP rate limits and bounded container logs. Limits assume one backend instance.
- Retry transient device push failures with bounded backoff and expiry. Delivery to physical phones is not verified by automated tests.
- Add mutual cancellation and appointment confirmation to accepted fridge exchanges. Cancellation releases reservations but requires manual food re-publication.
- Bound nearby fridge queries and batch existing requests.
- Save recipes/recent cooking and copy selected outstanding shopping items into next week without automatic stock deduction.
- Allow deleting all of the authenticated user's notifications, including unread entries.
- Replace root tab history; nested pages/dialogs go back one level. Root back shows a brief bottom toast and leaves the history guard consumed. A second physical Back within 2.5 seconds is handled by the browser/OS. After the timeout, the guard is restored. There is no window.close() or artificial exit screen.

Validation: 84 backend tests and 13 frontend tests passed; production frontend build passed. Mocked mobile-width browser checks cover unread deletion, exchange appointments/cancellation, recipe saving/cooking, selected shopping carry, tab history, nested chat/profile and post creation back navigation, repeated opening/closing, and double-back navigation out of the app, including timeout rearming and reload without duplicate history entries. Physical Android/iOS OS behavior still requires device testing.

Deployment preserves server-only secrets and operational configuration, backs up the database and running artifacts, and checks HTTP/API access protection. MySQL logging options take effect on its next container recreation; this rollout does not restart MySQL.
