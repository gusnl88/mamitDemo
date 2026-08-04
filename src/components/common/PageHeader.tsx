"use client";

import type { ReactNode } from "react";
import { Space, Typography } from "antd";

interface PageHeaderProps {
  title: string;
  description?: string;
  extra?: ReactNode;
}

export function PageHeader({ title, description, extra }: PageHeaderProps) {
  return (
    <Space
      style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}
      align="start"
      wrap
    >
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {description && <Typography.Text type="secondary">{description}</Typography.Text>}
      </div>
      {extra}
    </Space>
  );
}
