"use client";

import useSWR from "swr";
import { Col, Row, Typography } from "antd";
import { BellOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { useAuthStore } from "@/store/useAuthStore";
import { RoleTag } from "@/components/common/RoleTag";
import { StatCard } from "@/components/common/StatCard";
import { ErrorAlert } from "@/components/common/ErrorAlert";

interface NotificationsResult {
  notifications: unknown[];
  serverTime: string;
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { data, error, isLoading, mutate } = useSWR<NotificationsResult>("/notifications");

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

      {error && <ErrorAlert message="데이터를 불러오지 못했습니다." onRetry={() => mutate()} />}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="알림"
            value={data?.notifications.length ?? 0}
            icon={<BellOutlined />}
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="서버 시간"
            value={data?.serverTime ?? "-"}
            icon={<ClockCircleOutlined />}
            loading={isLoading}
          />
        </Col>
      </Row>
    </div>
  );
}
