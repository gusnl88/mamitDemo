"use client";

import { useEffect } from "react";
import { App } from "antd";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/useAuthStore";

/** 자동 로그아웃 카운트다운 경고가 뜨기 전까지의 비활성 시간. */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30분

/** 자동 로그아웃 전 경고 모달에 표시되는 카운트다운 시간. */
const COUNTDOWN_MS = 60 * 1000; // 60초

/** 활동으로 타이머가 리셋되는 최소 간격 (throttle). */
const ACTIVITY_THROTTLE_MS = 1000;

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

/**
 * 인증 영역 안에서 한 번만 마운트 (`(admin)/layout.tsx` 참고).
 * IDLE_TIMEOUT_MS 동안 사용자 활동이 없으면 카운트다운 경고 모달을
 * 띄우고, COUNTDOWN_MS 안에 응답이 없으면 자동으로 로그아웃시킴.
 */
export function useIdleAutoLogout() {
  const { modal } = App.useApp();

  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let countdownTimer: ReturnType<typeof setInterval> | null = null;
    let modalInstance: ReturnType<typeof modal.confirm> | null = null;
    let isWarning = false;
    let lastReset = 0;

    const clearIdleTimer = () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    };

    const clearCountdownTimer = () => {
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    };

    const closeWarning = () => {
      isWarning = false;
      clearCountdownTimer();
      if (modalInstance) {
        modalInstance.destroy();
        modalInstance = null;
      }
    };

    const logout = async () => {
      closeWarning();
      clearIdleTimer();
      try {
        await apiClient.post("/auth/logout");
      } catch {
        // 최선을 다해 호출하는 것뿐 — 실패해도 로컬 세션은 그대로 정리 진행.
      } finally {
        useAuthStore.getState().clearAuth();
        window.location.href = "/login";
      }
    };

    const countdownText = (seconds: number) =>
      `1분 후 자동 로그아웃됩니다. 계속 이용하시겠습니까? (${seconds}초)`;

    const startIdleTimer = () => {
      clearIdleTimer();
      idleTimer = setTimeout(showWarning, IDLE_TIMEOUT_MS);
    };

    function showWarning() {
      isWarning = true;
      let remainingSeconds = Math.floor(COUNTDOWN_MS / 1000);

      modalInstance = modal.confirm({
        title: "자동 로그아웃 안내",
        content: countdownText(remainingSeconds),
        okText: "계속 이용",
        okCancel: false,
        closable: false,
        mask: { closable: false },
        keyboard: false,
        onOk: () => {
          closeWarning();
          startIdleTimer();
        },
      });

      countdownTimer = setInterval(() => {
        remainingSeconds -= 1;
        if (remainingSeconds <= 0) {
          clearCountdownTimer();
          void logout();
          return;
        }
        modalInstance?.update({ content: countdownText(remainingSeconds) });
      }, 1000);
    }

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastReset < ACTIVITY_THROTTLE_MS) {
        return;
      }
      lastReset = now;
      if (isWarning) {
        closeWarning();
      }
      startIdleTimer();
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    startIdleTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      clearIdleTimer();
      clearCountdownTimer();
      modalInstance?.destroy();
    };
  }, [modal]);
}

/** `(admin)/layout.tsx`가 클라이언트 컴포넌트일 필요 없도록 스스로 마운트하는 래퍼. */
export function IdleAutoLogout() {
  useIdleAutoLogout();
  return null;
}
