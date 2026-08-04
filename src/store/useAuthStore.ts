"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { setAuthCookies, clearAuthCookies } from "@/lib/auth/cookies";
import type { AuthUser } from "@/types/auth";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  setAuth: (token: string, refreshToken: string, user: AuthUser) => void;
  clearAuth: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      hasHydrated: false,
      setAuth: (token, refreshToken, user) => {
        setAuthCookies(user.role);
        set({ token, refreshToken, user });
      },
      clearAuth: () => {
        clearAuthCookies();
        set({ token: null, refreshToken: null, user: null });
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "mamit-auth",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
