import { API_ENDPOINTS, apiRequest } from './api/config';

function decodeApplicationServerKey(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = window.atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function supportsWebPush(): boolean {
  return 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
}

export async function registerWebPushSubscription(
  { requestPermission = false }: { requestPermission?: boolean } = {}
): Promise<boolean> {
  if (!supportsWebPush()) return false;

  // Ask synchronously from the settings button so browsers that require a
  // direct user gesture (including installed iOS web apps) can show the prompt.
  const permission = Notification.permission === 'default' && requestPermission
    ? await Notification.requestPermission()
    : Notification.permission;
  if (permission !== 'granted') return false;

  try {
    const keyResponse = await apiRequest(API_ENDPOINTS.webPushPublicKey, { method: 'GET' });
    const publicKey = keyResponse?.data || keyResponse?.publicKey;
    if (typeof publicKey !== 'string' || !publicKey) {
      console.warn('Web Push 서버 공개 키가 설정되지 않았습니다.');
      return false;
    }

    const registration = await navigator.serviceWorker.register('/service-worker.js');
    const readyRegistration = await navigator.serviceWorker.ready;
    const pushManager = registration.pushManager || readyRegistration.pushManager;
    let subscription = await pushManager.getSubscription();

    if (subscription) {
      const currentKey = subscription.options.applicationServerKey;
      const savedKey = localStorage.getItem('webPushApplicationServerKey');
      const expectedKey = decodeApplicationServerKey(publicKey);
      const keyMatches = currentKey
        ? bytesEqual(new Uint8Array(currentKey), expectedKey)
        : savedKey === publicKey;
      if (!keyMatches) {
        await subscription.unsubscribe();
        subscription = null;
      }
    }

    if (!subscription) {
      subscription = await pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeApplicationServerKey(publicKey),
      });
    }
    localStorage.setItem('webPushApplicationServerKey', publicKey);

    const serialized = subscription.toJSON();
    if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys?.auth) {
      console.warn('브라우저 푸시 구독 정보가 올바르지 않습니다.');
      return false;
    }

    await apiRequest(API_ENDPOINTS.webPushSubscriptions, {
      method: 'POST',
      body: JSON.stringify(serialized),
    });
    console.info('Web Push 구독을 백엔드에 등록했습니다.');
    return true;
  } catch (error) {
    console.error('Web Push 등록에 실패했습니다.', error);
    return false;
  }
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
