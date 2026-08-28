"use client";

import { Typography } from "antd";
import { useAuthStore } from "@/store/useAuthStore";
import { RoleTag } from "@/components/common/RoleTag";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      <Typography.Title level={4}>
        안녕하세요, {user?.name}
        {user && (
          <>
            {" "}
            (<RoleTag role={user.role} />)
          </>
        )}
        님
      </Typography.Title>
    </div>
  );
}
