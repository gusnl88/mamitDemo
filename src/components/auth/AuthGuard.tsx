"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { LoadingScreen } from "@/components/common/LoadingScreen";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace("/login");
    } else if (user?.mustChangePassword) {
      router.replace("/change-password");
    }
  }, [hasHydrated, token, user, router]);

  if (!hasHydrated || !token || user?.mustChangePassword) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
