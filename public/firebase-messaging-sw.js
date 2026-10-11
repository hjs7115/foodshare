/* global firebase */
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCJb7J--Z4oCbmLZFNFCS-sWxa87j9zmDY',
  authDomain: 'foodshare-27405.firebaseapp.com',
  projectId: 'foodshare-27405',
  storageBucket: 'foodshare-27405.firebasestorage.app',
  messagingSenderId: '1027733868360',
  appId: '1:1027733868360:web:ef80eb6b455f4d53f5ad7d',
  measurementId: 'G-MHRY9FK291',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const clickAction = data.clickAction || '/?screen=notifications';
  self.registration.showNotification(data.title || '반띵 알림', {
    body: data.body || '새 알림이 도착했습니다.',
    icon: '/assets/notification-icon-192.png',
    badge: '/assets/notification-badge-96.png',
    data: { clickAction },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clickAction = event.notification.data?.clickAction || '/';
  const targetUrl = new URL(clickAction, self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existingClient = clients.find((client) => client.url.startsWith(self.location.origin));
    if (existingClient) {
      existingClient.focus();
      existingClient.navigate(targetUrl);
      return;
    }
    return self.clients.openWindow(targetUrl);
  }));
});
