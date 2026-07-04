import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { API_ENDPOINTS, apiRequest } from './api/config';
import { getAuthToken } from './auth/session';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCJb7J--Z4oCbmLZFNFCS-sWxa87j9zmDY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'foodshare-27405.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'foodshare-27405',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'foodshare-27405.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1027733868360',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1027733868360:web:ef80eb6b455f4d53f5ad7d',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-MHRY9FK291',
};

const app = initializeApp(firebaseConfig);

export async function registerFirebaseMessaging(): Promise<void> {
  const authToken = getAuthToken();
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  if (!authToken || !vapidKey || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return;
  }

  const supported = await isSupported();
  if (!supported) {
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return;
  }

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    return;
  }

  await apiRequest(API_ENDPOINTS.registerFcmToken, {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}
