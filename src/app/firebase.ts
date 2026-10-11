import { initializeApp } from 'firebase/app';
import { deleteToken, getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging';
import { API_ENDPOINTS, apiRequest } from './api/config';
import { hasAuthSession } from './auth/session';

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

async function getMessagingInstance() {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported())) return null;
  return getMessaging(app);
}

export async function registerFirebaseMessaging({ requestPermission = false } = {}): Promise<boolean> {
  if (!hasAuthSession()) return false;
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  const messaging = await getMessagingInstance();
  if (!messaging || !vapidKey) return false;

  let permission = Notification.permission;
  if (permission === 'default' && requestPermission) permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return false;

  await apiRequest(API_ENDPOINTS.registerFcmToken, {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  return true;
}

export async function unregisterFirebaseMessaging(): Promise<void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return;
  const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
  if (token) {
    await apiRequest(API_ENDPOINTS.removeFcmToken, {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    });
  }
  await deleteToken(messaging);
}

export async function listenForegroundMessages(
  handler: (payload: MessagePayload) => void
): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging || Notification.permission !== 'granted') return () => undefined;
  return onMessage(messaging, handler);
}
