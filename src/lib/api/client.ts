import { dispatchMockRequest } from "@/lib/mock/router";

/**
 * 실제 서버/DB가 없는 정적 데모용 mock 클라이언트.
 * 원래 axios 인스턴스와 동일한 `{get,post,put,patch,delete}` 메서드 형태를 흉내 내서,
 * 이 파일을 import하는 페이지 컴포넌트 쪽 코드는 한 줄도 바꾸지 않아도 되게 만든다.
 * 응답은 실제 axios 인터셉터가 언랩한 뒤와 동일하게 항상 `{ data: <payload> }` 형태.
 */
export const apiClient = {
  get<T>(url: string): Promise<{ data: T }> {
    return dispatchMockRequest<T>("get", url);
  },
  post<T>(url: string, body?: unknown, _config?: unknown): Promise<{ data: T }> {
    return dispatchMockRequest<T>("post", url, body);
  },
  put<T>(url: string, body?: unknown): Promise<{ data: T }> {
    return dispatchMockRequest<T>("put", url, body);
  },
  patch<T>(url: string, body?: unknown): Promise<{ data: T }> {
    return dispatchMockRequest<T>("patch", url, body);
  },
  delete<T>(url: string): Promise<{ data: T }> {
    return dispatchMockRequest<T>("delete", url);
  },
};
