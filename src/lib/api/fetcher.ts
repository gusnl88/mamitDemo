import { apiClient } from "./client";

/**
 * apiClient의 응답 인터셉터가 이미 `ApiResponse.result`를 꺼내주므로,
 * 여기서 resolve되는 값은 `result` payload 자체(T로 타입됨).
 */
export async function fetcher<T>(url: string): Promise<T> {
  const response = await apiClient.get(url);
  return response.data as T;
}
