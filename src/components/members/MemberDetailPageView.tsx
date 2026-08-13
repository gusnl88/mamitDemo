"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, Space, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { MemberDetailContent } from "@/components/members/MemberDetailContent";
import type { MemberDetail } from "@/components/members/MemberDetailContent";

interface MemberDetailPageViewProps {
  id: string;
}

export function MemberDetailPageView({ id }: MemberDetailPageViewProps) {
  const {
    data: detail,
    error,
    isLoading,
    mutate,
  } = useSWR<MemberDetail>(`/members/${id}`);

  return (
    <Card>
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <Link href="/members">
          <Space>
            <ArrowLeftOutlined />
            회원 목록으로
          </Space>
        </Link>
        <Typography.Title level={4} style={{ margin: 0 }}>
          회원 상세
        </Typography.Title>
        {error ? (
          <ErrorAlert message="회원 정보를 불러오지 못했습니다." onRetry={() => mutate()} />
        ) : (
          <MemberDetailContent detail={detail} loading={isLoading} />
        )}
      </Space>
    </Card>
  );
}
