import { clearAuthSession, getSessionRevision, getAuthToken, getRefreshToken, updateAuthTokens } from './session';

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(baseUrl: string, failedToken: string | null): Promise<string | null> {
  if (getAuthToken() !== failedToken) return getAuthToken();
  if (refreshInFlight) return refreshInFlight;
  const perform = async () => {
    if (getAuthToken() !== failedToken) return getAuthToken();
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    const response = await fetch(baseUrl + '/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    // Never restore a session after logout or an account change.
    if (getRefreshToken() !== refreshToken) return getAuthToken();
    if (response.status === 401 || response.status === 400) {
      clearAuthSession();
      return null;
    }
    if (!response.ok) throw new Error('로그인 갱신에 일시적으로 실패했습니다. 다시 시도해주세요.');
    const payload = await response.json();
    if (getRefreshToken() !== refreshToken) return getAuthToken();
    const data = payload.data || payload;
    if (!data.accessToken || !data.refreshToken) throw new Error('로그인 갱신 응답을 확인할 수 없습니다.');
    updateAuthTokens(data.accessToken, data.refreshToken);
    return data.accessToken as string;
  };
  // Coordinate refresh-token rotation across tabs when Web Locks is available.
  refreshInFlight = (typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('foodshare-token-refresh', perform)
    : perform()).finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

function expiresSoon(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const exp = JSON.parse(atob(payload)).exp;
    return typeof exp === 'number' && exp * 1000 <= Date.now() + 30000;
  } catch { return false; }
}

export async function authenticatedFetch(url: string, options: RequestInit, baseUrl: string): Promise<Response> {
  const revision = getSessionRevision();
  const assertSameAccount = () => {
    if (revision !== getSessionRevision() && getAuthToken()) {
      throw new Error('로그인 계정이 변경되어 이전 요청을 취소했습니다.');
    }
  };
  let token = getAuthToken();
  if (expiresSoon(token) && getRefreshToken()) token = await refreshAccessToken(baseUrl, token);
  const send = (accessToken: string | null) => {
    assertSameAccount();
    const headers = new Headers(options.headers);
    if (accessToken) headers.set('Authorization', 'Bearer ' + accessToken);
    else headers.delete('Authorization');
    return fetch(url, { ...options, headers });
  };
  let response = await send(token);
  assertSameAccount();
  if (response.status === 401 && token) {
    const nextToken = await refreshAccessToken(baseUrl, token);
    if (nextToken) {
      response = await send(nextToken);
      assertSameAccount();
      if (response.status === 401 && getAuthToken() === nextToken) clearAuthSession();
    }
    else if (getAuthToken() === token) clearAuthSession();
  }
  return response;
}
