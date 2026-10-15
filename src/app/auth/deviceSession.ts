import { clearAuthSession, getRefreshToken, getAuthToken, hasAuthSession } from './session';
import { API_ENDPOINTS } from '../api/config';
import { finishMessagingReset, unregisterFirebaseMessaging } from '../firebase';

export async function resetDeviceSession(): Promise<boolean> {
  let complete = true;
  // Detach this browser's push subscription before removing its authentication.
  try { await unregisterFirebaseMessaging(); } catch { complete = false; }
  try {
    const revoke = async () => {
      if (!hasAuthSession()) return;
      // Keep the refresh token in the body paired with the same access token.
      const response = await fetch(API_ENDPOINTS.logout, {
        method: 'POST', headers: {'Content-Type':'application/json', Authorization:'Bearer '+getAuthToken()},
        body: JSON.stringify({refreshToken:getRefreshToken()}), signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Device logout failed');
    };
    if (navigator.locks) await navigator.locks.request('foodshare-token-refresh', revoke);
    else await revoke();
  } catch { complete = false; }
  finally {
    localStorage.removeItem('pushToken');
    localStorage.removeItem('installation-reset-pending');
    clearAuthSession();
    finishMessagingReset();
  }
  return complete;
}
