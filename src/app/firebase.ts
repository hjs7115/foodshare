import { initializeApp } from 'firebase/app';
import { deleteToken, getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging';
import { API_ENDPOINTS, apiRequest } from './api/config';
import { getSessionRevision, hasAuthSession } from './auth/session';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

const app = initializeApp(firebaseConfig);
let disconnecting = false;
let connectionGeneration = 0;
export function finishMessagingReset() { disconnecting = false; }

async function getMessagingInstance() {
  if (!firebaseConfig.apiKey || !('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported())) return null;
  return getMessaging(app);
}

export async function registerFirebaseMessaging({ requestPermission = false } = {}): Promise<boolean> {
  if (disconnecting || !hasAuthSession()) return false;
  const revision = getSessionRevision();
  const generation = connectionGeneration;
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    throw new Error('아이폰은 홈 화면에 추가한 반띵 아이콘으로 실행해주세요. 지원 브라우저에서도 다시 시도할 수 있어요.');
  }
  if (!vapidKey) throw new Error('알림 연결 설정을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.');

  let permission = Notification.permission;
  if (permission === 'default' && requestPermission) permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  const messaging = await getMessagingInstance();
  if (!messaging) throw new Error('이 환경에서는 푸시 알림을 지원하지 않습니다. 최신 브라우저와 홈 화면 앱을 사용해주세요.');

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token || disconnecting || generation !== connectionGeneration || revision !== getSessionRevision()) return false;

  await apiRequest(API_ENDPOINTS.registerFcmToken, {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  if (disconnecting || generation !== connectionGeneration || revision !== getSessionRevision()) {
    if (hasAuthSession()) await apiRequest(API_ENDPOINTS.removeFcmToken, {method:'DELETE',body:JSON.stringify({token})});
    await deleteToken(messaging);
    return false;
  }
  localStorage.setItem('pushToken', token);
  window.dispatchEvent(new Event('push-connected'));
  return true;
}

export async function unregisterFirebaseMessaging(): Promise<void> {
  disconnecting = true;
  connectionGeneration++;
  const token = localStorage.getItem('pushToken');
  let serverError: unknown;
  if (token && hasAuthSession()) {
    try { await apiRequest(API_ENDPOINTS.removeFcmToken, {method:'DELETE',body:JSON.stringify({token}),signal:AbortSignal.timeout(10000)}); }
    catch (error) { serverError = error; }
  }
  try { const messaging = await getMessagingInstance(); if (messaging) await deleteToken(messaging); }
  finally {
    if ('serviceWorker' in navigator) {
      const registration=await navigator.serviceWorker.getRegistration('/');
      const subscription=await registration?.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
    }
    localStorage.removeItem('pushToken');
  }
  if (serverError) throw serverError;
}

export async function listenForegroundMessages(
  handler: (payload: MessagePayload) => void
): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging || Notification.permission !== 'granted') return () => undefined;
  return onMessage(messaging, handler);
}
