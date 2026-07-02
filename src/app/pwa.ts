export function registerPwaServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js').catch((error) => {
      console.warn('PWA service worker registration failed.', error);
    });
  });
}