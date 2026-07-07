importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

const CACHE_NAME = 'foodshare-pwa-v3';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/food-placeholder.png',
  '/assets/app-icon-192.png',
  '/assets/app-icon-512.png',
  '/assets/favicon-32.png',
  '/assets/notification-icon-192.png',
  '/assets/notification-badge-96.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

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
  const title = payload.notification?.title || payload.data?.title || '반띵';
  const clickAction = payload.data?.clickAction || '/';

  const options = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: '/assets/notification-icon-192.png',
    badge: '/assets/notification-badge-96.png',
    data: {
      clickAction,
      type: payload.data?.type || '',
      targetType: payload.data?.targetType || '',
      targetId: payload.data?.targetId || '',
    },
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const clickAction = event.notification.data?.clickAction || '/';
  const targetUrl = new URL(clickAction, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url.startsWith(self.location.origin));

      if (existingClient) {
        existingClient.focus();
        existingClient.navigate(targetUrl);
        return;
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});
