"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { setAuthCookies, clearAuthCookies } from "@/lib/auth/cookies";
import type { AuthUser } from "@/types/auth";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hasHydrated: false,
      setAuth: (token, user) => {
        setAuthCookies(user.role);
        set({ token, user });
      },
      clearAuth: () => {
        clearAuthCookies();
        set({ token: null, user: null });
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "mamit-auth",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
