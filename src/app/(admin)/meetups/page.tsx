"use client";

import { useState } from "react";
import useSWR from "swr";
import { Descriptions, Empty, Modal, Spin, Tag } from "antd";
import dayjs from "dayjs";
import { DataTable } from "@/components/table/DataTable";
import type { SortSpec } from "@/components/table/DataTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { MemberDetailModal } from "@/components/members/MemberDetailModal";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";

interface MoimListItem {
  id: number;
  name: string;
  categoryName: string;
  regionName: string | null;
  memberCount: number;
  createdAt: string;
}

interface MoimPageResponse {
  content: MoimListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const PAGE_SIZE = 10;

/** DataTable의 정렬 상태 → 백엔드 `sort` 쿼리 문자열("-memberCount,name" 형식). */
const toSortParam = (sorts: SortSpec[]) =>
  sorts.map((sort) => (sort.order === "descend" ? `-${sort.key}` : sort.key)).join(",");

interface MoimMemberItem {
  userId: number;
  nickname: string;
  role: string;
  joinedAt: string;
}

interface MoimDetail {
  id: number;
  name: string;
  description: string | null;
  categoryName: string;
  regionName: string | null;
  maxMembers: number;
  currentMembers: number;
  status: string;
  createdAt: string;
  members: MoimMemberItem[];
}

const STATUS_LABEL: Record<string, string> = {
  RECRUITING: "모집중",
  ONGOING: "진행중",
  CLOSED: "마감",
  COMPLETED: "완료",
  DELETED: "삭제됨",
};

const formatDateTime = (value: string | null) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-";

export default function MeetupsPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [sorts, setSorts] = useState<SortSpec[]>([]);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<MoimDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [memberDetailId, setMemberDetailId] = useState<number | null>(null);

  const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
  if (keyword) query.set("keyword", keyword);
  const sortParam = toSortParam(sorts);
  if (sortParam) query.set("sort", sortParam);

  const { data, error, isLoading, mutate } = useSWR<MoimPageResponse>(`/moims?${query.toString()}`);

  const handleSearchChange = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  const handleSortChange = (nextSorts: SortSpec[]) => {
    setSorts(nextSorts);
    setPage(1);
  };

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const { data: detailData } = await apiClient.get<MoimDetail>(`/moims/${id}`);
      setDetail(detailData);
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      // 인터셉터가 이미 에러 메시지를 띄워줌 — 다이얼로그만 닫음.
      setDetailId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    { title: "모임명", dataIndex: "name", key: "name", sorter: { multiple: 1 } },
    { title: "카테고리", dataIndex: "categoryName", key: "categoryName", sorter: { multiple: 2 } },
    {
      title: "지역",
      dataIndex: "regionName",
      key: "regionName",
      render: (value: string | null) => value ?? "-",
      sorter: { multiple: 5 },
    },
    { title: "멤버 수", dataIndex: "memberCount", key: "memberCount", sorter: { multiple: 3 } },
    {
      title: "생성일",
      dataIndex: "createdAt",
      key: "createdAt",
      render: formatDateTime,
      sorter: { multiple: 4 },
    },
  ];

  return (
    <>
      {error && <ErrorAlert message="모임 목록을 불러오지 못했습니다." onRetry={() => mutate()} />}
      <DataTable<MoimListItem>
        title="모임관리"
        searchPlaceholder="모임명 검색"
        searchValue={keyword}
        onSearchChange={handleSearchChange}
        rowKey="id"
        columns={columns}
        dataSource={data?.content ?? []}
        loading={isLoading}
        onRowClick={(record) => openDetail(record.id)}
        serverSide
        total={data?.totalElements}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSortChange={handleSortChange}
      />

      <Modal
        title="모임 상세"
        open={detailId !== null}
        onCancel={() => setDetailId(null)}
        footer={null}
        destroyOnHidden
        style={{ top: 20 }}
        styles={{ body: { maxHeight: "calc(100vh - 160px)", overflowY: "auto" } }}
      >
        {detailLoading || !detail ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin />
          </div>
        ) : (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="모임명">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="카테고리">{detail.categoryName}</Descriptions.Item>
              <Descriptions.Item label="지역">{detail.regionName ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="설명">{detail.description ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="인원">
                {detail.currentMembers} / {detail.maxMembers}
              </Descriptions.Item>
              <Descriptions.Item label="상태">
                <Tag>{STATUS_LABEL[detail.status] ?? detail.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="생성일">
                {formatDateTime(detail.createdAt)}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>회원 목록</div>
              {detail.members.length === 0 ? (
                <Empty description="가입된 회원이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    maxHeight: "min(240px, 35vh)",
                    overflowY: "auto",
                    paddingRight: 4,
                  }}
                >
                  {detail.members.map((member) => (
                    <div
                      key={member.userId}
                      onClick={() => setMemberDetailId(member.userId)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 10px",
                        border: "1px solid rgba(0, 0, 0, 0.06)",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      <span>{member.nickname}</span>
                      <Tag color={member.role === "OWNER" ? "gold" : "default"}>
                        {member.role === "OWNER" ? "모임장" : "멤버"}
                      </Tag>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Modal>

      <MemberDetailModal memberId={memberDetailId} onClose={() => setMemberDetailId(null)} />
    </>
  );
}
