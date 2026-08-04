import type { ReactNode } from "react";
import { Card, Skeleton, Statistic } from "antd";

export interface StatCardProps {
  title: string;
  value: number | string;
  icon?: ReactNode;
  loading?: boolean;
}

/** 대시보드 요약 행에 쓰이는 Card 감싼 통계 표시. */
export function StatCard({ title, value, icon, loading = false }: StatCardProps) {
  return (
    <Card>
      {loading ? (
        <Skeleton active paragraph={{ rows: 1 }} />
      ) : (
        <Statistic title={title} value={value} prefix={icon} />
      )}
    </Card>
  );
}
