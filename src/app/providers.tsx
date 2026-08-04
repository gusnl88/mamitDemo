"use client";

import { useEffect } from "react";
import { ConfigProvider, App as AntdApp, theme } from "antd";
import koKR from "antd/locale/ko_KR";
import { SWRConfig } from "swr";
import { fetcher } from "@/lib/api/fetcher";
import { setMessageApi } from "@/lib/api/messageBridge";
import { useAuthStore } from "@/store/useAuthStore";
import { themeConfig } from "@/config/theme";

/** axios 인터셉터가 컨텍스트 인지 message 인스턴스를 쓸 수 있도록 등록만 하는 컴포넌트. */
function MessageBridge() {
  const { message } = AntdApp.useApp();

  useEffect(() => {
    setMessageApi(message);
  }, [message]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  return (
    <ConfigProvider
      locale={koKR}
      theme={{
        algorithm: theme.defaultAlgorithm,
        ...themeConfig,
      }}
    >
      <AntdApp>
        <MessageBridge />
        <SWRConfig
          value={{
            fetcher,
            revalidateOnFocus: false,
            shouldRetryOnError: false,
          }}
        >
          {children}
        </SWRConfig>
      </AntdApp>
    </ConfigProvider>
  );
}
