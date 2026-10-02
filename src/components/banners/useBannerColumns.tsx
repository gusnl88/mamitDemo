"use client";

import { Button, Image, Popconfirm, Space, Switch, Tag } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import {
  CATEGORY_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  bannerStatus,
  formatPeriod,
  orderedInCategory,
  type BannerCategory,
  type BannerRow,
} from "@/components/banners/banner";

interface UseBannerColumnsParams {
  /** 순서 버튼 활성화 여부를 정하려면 카테고리 전체가 필요하다 (필터된 목록 말고 전체). */
  allRows: BannerRow[];
  /** BANNER_WRITE 가 없으면 순서·노출·관리 컨트롤을 숨기거나 막는다. */
  canWrite: boolean;
  /** 순서 교환(API 3번)이 진행 중이면 다른 이동 버튼을 막는다. */
  moving: boolean;
  onMove: (row: BannerRow, direction: "up" | "down") => void;
  onToggleActive: (row: BannerRow, active: boolean) => void;
  onEdit: (row: BannerRow) => void;
  onDelete: (row: BannerRow) => void;
}

/** 배너 목록 표의 컬럼 정의. */
export function useBannerColumns({
  allRows,
  canWrite,
  moving,
  onMove,
  onToggleActive,
  onEdit,
  onDelete,
}: UseBannerColumnsParams) {
  return [
    {
      title: "이미지",
      dataIndex: "imageUrl",
      key: "imageUrl",
      render: (url: string, row: BannerRow) => <Image src={url} alt={row.title} width={80} />,
    },
    {
      title: "타이틀",
      dataIndex: "title",
      key: "title",
      sorter: (a: BannerRow, b: BannerRow) => a.title.localeCompare(b.title, "ko"),
    },
    {
      title: "카테고리",
      dataIndex: "category",
      key: "category",
      render: (category: BannerCategory) => CATEGORY_LABEL[category],
      sorter: (a: BannerRow, b: BannerRow) => a.category.localeCompare(b.category),
    },
    {
      title: "노출기간",
      // dataIndex 가 없으면 모바일 카드에서 버튼 행으로 빠진다 — 값은 render 에서 직접 만든다.
      dataIndex: "displayStartAt",
      key: "period",
      render: (_: unknown, row: BannerRow) => formatPeriod(row),
      sorter: (a: BannerRow, b: BannerRow) =>
        (a.displayStartAt ?? "").localeCompare(b.displayStartAt ?? ""),
    },
    {
      title: "노출상태",
      dataIndex: "visibleNow",
      key: "status",
      render: (_: unknown, row: BannerRow) => {
        const status = bannerStatus(row);
        return <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>;
      },
      sorter: (a: BannerRow, b: BannerRow) => bannerStatus(a).localeCompare(bannerStatus(b)),
    },
    {
      title: "노출순서",
      dataIndex: "displayOrder",
      key: "displayOrder",
      render: (order: number | null, row: BannerRow) => {
        if (order == null) return "-";
        if (!canWrite) return order;
        const ordered = orderedInCategory(allRows, row.category);
        const index = ordered.findIndex((item) => item.id === row.id);
        return (
          <Space size={4}>
            {order}
            <Button
              size="small"
              type="text"
              icon={<ArrowUpOutlined />}
              disabled={moving || index <= 0}
              onClick={() => onMove(row, "up")}
            />
            <Button
              size="small"
              type="text"
              icon={<ArrowDownOutlined />}
              disabled={moving || index === ordered.length - 1}
              onClick={() => onMove(row, "down")}
            />
          </Space>
        );
      },
      sorter: (a: BannerRow, b: BannerRow) => (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity),
    },
    {
      title: "노출",
      key: "active",
      render: (_: unknown, row: BannerRow) => (
        <Switch
          checked={row.isActive}
          disabled={!canWrite}
          onChange={(checked) => onToggleActive(row, checked)}
        />
      ),
    },
    ...(canWrite
      ? [
          {
            title: "관리",
            key: "actions",
            render: (_: unknown, row: BannerRow) => (
              <Space>
                <Button size="small" onClick={() => onEdit(row)}>
                  수정
                </Button>
                <Popconfirm
                  title="정말 삭제하시겠습니까?"
                  onConfirm={() => onDelete(row)}
                  okText="삭제"
                  cancelText="취소"
                >
                  <Button size="small" danger>
                    삭제
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];
}
