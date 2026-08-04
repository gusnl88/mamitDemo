import type { MessageInstance } from "antd/es/message/interface";

// axios 인터셉터(response.ts)는 React 컴포넌트/훅이 아니라서 App.useApp()을 직접
// 쓸 수 없음 — Providers가 마운트될 때 컨텍스트 인지 인스턴스를 여기에 등록해두고
// 인터셉터는 이 브리지를 통해서만 message를 사용한다.
let bridgedMessage: MessageInstance | null = null;

export function setMessageApi(instance: MessageInstance) {
  bridgedMessage = instance;
}

export function getMessageApi(): MessageInstance | null {
  return bridgedMessage;
}
