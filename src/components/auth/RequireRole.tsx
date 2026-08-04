"use client";

import { Result } from "antd";
import { useAuthStore } from "@/store/useAuthStore";
import type { Role } from "@/types/auth";

export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const role = useAuthStore((state) => state.user?.role);

  if (!role || !roles.includes(role)) {
    return <Result status="403" title="403" subTitle="이 페이지에 접근할 권한이 없습니다." />;
  }

  return <>{children}</>;
}
