export function registerPwaServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  if (import.meta.env.DEV) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(
          registrations
            .filter((registration) => !registration.active?.scriptURL.endsWith('/firebase-messaging-sw.js'))
            .map((registration) => registration.unregister())
        ))
        .catch((error) => {
          console.warn('Service worker cleanup failed.', error);
        });

      if ('caches' in window) {
        caches.keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .catch((error) => {
            console.warn('Cache cleanup failed.', error);
          });
      }
    });
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js').catch((error) => {
      console.warn('PWA service worker registration failed.', error);
    });
  });
}
