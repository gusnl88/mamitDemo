"use client";

import type { ReactNode } from "react";
import { Card } from "antd";
import { PageHeader } from "@/components/common/PageHeader";

export interface ContentCardProps {
  title: string;
  description?: string;
  extra?: ReactNode;
  children?: ReactNode;
}

/** 테이블이 아닌 콘텐츠용 범용 Card + PageHeader 래퍼 (DataTable 구성 방식과 동일). */
export function ContentCard({ title, description, extra, children }: ContentCardProps) {
  return (
    <Card>
      <PageHeader title={title} description={description} extra={extra} />
      {children}
    </Card>
  );
}
