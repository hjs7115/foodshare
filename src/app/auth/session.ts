let sessionRevision = 0;
export function getSessionRevision() { return sessionRevision; }
const AUTH_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_INFO_KEY = 'userInfo';
const AUTO_LOGIN_KEY = 'autoLogin';
export const LOCAL_TEST_AUTH_TOKEN = 'local-test-session';

function normalizeAuthToken(token: string | null): string | null {
  if (!token) return null;

  let normalized = token.trim();
  while (normalized.toLowerCase().startsWith('bearer ')) {
    normalized = normalized.slice('bearer '.length).trim();
  }

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized || null;
}

export function getAuthToken(): string | null {
  const token = normalizeAuthToken(localStorage.getItem(AUTO_LOGIN_KEY) === 'true' ? localStorage.getItem(AUTH_TOKEN_KEY) : sessionStorage.getItem(AUTH_TOKEN_KEY));
  if (!token) return null;

  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  if (localStorage.getItem(AUTH_TOKEN_KEY)) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  return token;
}

export function getStoredUserInfo<T = any>(): T | null {
  const rawUserInfo = sessionStorage.getItem(USER_INFO_KEY) || localStorage.getItem(USER_INFO_KEY);
  if (!rawUserInfo) return null;

  try {
    if (!sessionStorage.getItem(USER_INFO_KEY)) {
      sessionStorage.setItem(USER_INFO_KEY, rawUserInfo);
    }
    return JSON.parse(rawUserInfo) as T;
  } catch {
    return null;
  }
}

export function saveAuthSession(token: string | null, userInfo: any, persist: boolean, refreshToken?: string | null) {
  clearAuthSession(false);

  const storage = persist ? localStorage : sessionStorage;
  const normalizedToken = normalizeAuthToken(token);
  if (normalizedToken) storage.setItem(AUTH_TOKEN_KEY, normalizedToken);
  if (refreshToken) storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (userInfo) storage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));

  if (persist) {
    localStorage.setItem(AUTO_LOGIN_KEY, 'true');
  }
}

export function saveStoredUserInfo(userInfo: any) {
  const storage = localStorage.getItem(AUTO_LOGIN_KEY) === 'true' ? localStorage : sessionStorage;
  storage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
}

export function hasAuthSession(): boolean {
  return Boolean(getAuthToken());
}

export function isLocalTestSession(): boolean {
  return import.meta.env.DEV && getAuthToken() === LOCAL_TEST_AUTH_TOKEN;
}

export function clearAuthSession(notify = true) {
  sessionRevision++;
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(USER_INFO_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_INFO_KEY);
  localStorage.removeItem(AUTO_LOGIN_KEY);
  localStorage.removeItem('userLocation');
  localStorage.removeItem('userLocationCoords');
  localStorage.removeItem('notificationSettings');
  localStorage.removeItem('chatSettings');
  localStorage.removeItem('push-onboarding-snooze');
  sessionStorage.removeItem('location-setup-skipped');

  if (notify && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth-session-cleared'));
  }
}

export function getRefreshToken(): string | null {
  return (localStorage.getItem(AUTO_LOGIN_KEY) === 'true' ? localStorage : sessionStorage).getItem(REFRESH_TOKEN_KEY);
}

export function updateAuthTokens(accessToken: string, refreshToken: string) {
  const storage = localStorage.getItem(AUTO_LOGIN_KEY) === 'true' ? localStorage : sessionStorage;
  storage.setItem(AUTH_TOKEN_KEY, accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (storage === localStorage) sessionStorage.removeItem(AUTH_TOKEN_KEY);
  window.dispatchEvent(new Event('auth-token-refreshed'));
}
