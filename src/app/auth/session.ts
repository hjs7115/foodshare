const AUTH_TOKEN_KEY = 'authToken';
const USER_INFO_KEY = 'userInfo';
const AUTO_LOGIN_KEY = 'autoLogin';

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
  const token = normalizeAuthToken(sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY));
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

export function saveAuthSession(token: string | null, userInfo: any, persist: boolean) {
  clearAuthSession();

  const storage = persist ? localStorage : sessionStorage;
  const normalizedToken = normalizeAuthToken(token);
  if (normalizedToken) storage.setItem(AUTH_TOKEN_KEY, normalizedToken);
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

export function clearAuthSession() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(USER_INFO_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_INFO_KEY);
  localStorage.removeItem(AUTO_LOGIN_KEY);
}
