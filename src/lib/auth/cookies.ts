/**
 * JWT 자체는 항상 localStorage에만 있고(zustand persist 사용) axios
 * 인터셉터가 API 요청에 붙여줌 — 쿠키로는 절대 전송되지 않음. 이
 * 두 쿠키는 `proxy.ts`가 낙관적으로 렌더링 전 리다이렉트를 할 수
 * 있도록 "로그인 여부" / "어떤 역할" 을 단순 플래그로만 미러링한 것.
 * 실제 인가는 매 API 호출마다 백엔드에서 여전히 이루어짐.
 */
export const AUTH_COOKIE_NAME = "mamit_auth";
export const ROLE_COOKIE_NAME = "mamit_role";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function setAuthCookies(role: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_NAME}=1; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
  document.cookie = `${ROLE_COOKIE_NAME}=${role}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}

export function clearAuthCookies() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0`;
  document.cookie = `${ROLE_COOKIE_NAME}=; path=/; max-age=0`;
}
