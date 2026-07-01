importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

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
  const title = payload.notification?.title || 'FoodShare';
  const options = {
    body: payload.notification?.body || '',
    icon: '/assets/food-placeholder.png',
  };

  self.registration.showNotification(title, options);
});
