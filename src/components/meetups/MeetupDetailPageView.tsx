"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, Space, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { MoimDetailContent } from "@/components/meetups/MoimDetailContent";
import type { MoimDetail } from "@/components/meetups/MoimDetailContent";

interface MeetupDetailPageViewProps {
  id: string;
}

export function MeetupDetailPageView({ id }: MeetupDetailPageViewProps) {
  const {
    data: detail,
    error,
    isLoading,
    mutate,
  } = useSWR<MoimDetail>(`/moims/${id}`);

  return (
    <Card>
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <Link href="/meetups" className="clickable">
          <Space>
            <ArrowLeftOutlined />
            모임 목록으로
          </Space>
        </Link>
        <Typography.Title level={4} style={{ margin: 0 }}>
          모임 상세
        </Typography.Title>
        {error ? (
          <ErrorAlert message="모임 정보를 불러오지 못했습니다." onRetry={() => mutate()} />
        ) : (
          <MoimDetailContent detail={detail} loading={isLoading} />
        )}
      </Space>
    </Card>
  );
}
