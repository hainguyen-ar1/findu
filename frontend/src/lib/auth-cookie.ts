/** Cookie signal cho Next.js middleware (SSR-safe) */
const AUTH_COOKIE = 'auth-token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 ngày

export function setAuthCookie(token: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
}
