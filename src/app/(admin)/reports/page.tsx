"use client";

import { useState } from "react";
import useSWR from "swr";
import { App, Descriptions, Input, Modal, Select, Space, Spin, Tag } from "antd";
import dayjs from "dayjs";
import { DataTable } from "@/components/table/DataTable";
import type { SortSpec } from "@/components/table/DataTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { MemberDetailModal } from "@/components/members/MemberDetailModal";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";

type ReportType =
  | "INAPPROPRIATE_CONTENT"
  | "SPAM_ADVERTISEMENT"
  | "HATE_SPEECH"
  | "SAFETY_CONCERN"
  | "FRAUD_SCAM"
  | "ETC";

type ReportStatus = "NEW" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

interface ReportListItem {
  id: number;
  type: ReportType;
  moimName: string;
  reporterNickname: string;
  reportedNickname: string;
  status: ReportStatus;
  createdAt: string;
}

interface ReportPageResponse {
  content: ReportListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const PAGE_SIZE = 10;

/** DataTable의 정렬 상태 → 백엔드 `sort` 쿼리 문자열("-status,reporterNickname" 형식). */
const toSortParam = (sorts: SortSpec[]) =>
  sorts.map((sort) => (sort.order === "descend" ? `-${sort.key}` : sort.key)).join(",");

interface ReportDetail {
  id: number;
  type: ReportType;
  title: string;
  content: string;
  moimId: number;
  moimName: string;
  reporterUserId: number;
  reporterNickname: string;
  reportedUserId: number;
  reportedNickname: string;
  status: ReportStatus;
  adminComment: string | null;
  processedAt: string | null;
  createdAt: string;
}

const TYPE_LABEL: Record<ReportType, string> = {
  INAPPROPRIATE_CONTENT: "부적절한 내용",
  SPAM_ADVERTISEMENT: "스팸/광고",
  HATE_SPEECH: "욕설 및 혐오표현",
  SAFETY_CONCERN: "안전상 우려",
  FRAUD_SCAM: "사기/허위정보",
  ETC: "기타",
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  NEW: "신규 접수",
  UNDER_REVIEW: "검토중",
  APPROVED: "승인됨",
  REJECTED: "거절됨",
};

const STATUS_COLOR: Record<ReportStatus, string> = {
  NEW: "blue",
  UNDER_REVIEW: "gold",
  APPROVED: "green",
  REJECTED: "red",
};

const formatDateTime = (value: string | null) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-");

export default function ReportsPage() {
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [sorts, setSorts] = useState<SortSpec[]>([]);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [memberDetailId, setMemberDetailId] = useState<number | null>(null);

  const [nextStatus, setNextStatus] = useState<ReportStatus | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [processing, setProcessing] = useState(false);

  const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
  if (keyword) query.set("keyword", keyword);
  const sortParam = toSortParam(sorts);
  if (sortParam) query.set("sort", sortParam);

  const { data, error, isLoading, mutate } = useSWR<ReportPageResponse>(`/reports?${query.toString()}`);

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
    setAdminComment("");
    setNextStatus(null);
    setDetailLoading(true);
    try {
      const { data: detailData } = await apiClient.get<ReportDetail>(`/reports/${id}`);
      setDetail(detailData);
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      // 인터셉터가 이미 에러 메시지를 표시함
      setDetailId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetail(null);
  };

  const isTerminal = detail?.status === "APPROVED" || detail?.status === "REJECTED";

  // 실제 신고 도메인 규칙과 동일: 검토중 전환은 신규 접수 상태에서만 가능.
  const availableStatusOptions: { value: ReportStatus; label: string }[] =
    detail?.status === "NEW"
      ? [
          { value: "UNDER_REVIEW", label: "검토중으로 변경" },
          { value: "APPROVED", label: "승인" },
          { value: "REJECTED", label: "거절" },
        ]
      : [
          { value: "APPROVED", label: "승인" },
          { value: "REJECTED", label: "거절" },
        ];

  const handleProcess = async () => {
    if (!detail || !nextStatus) return;
    setProcessing(true);
    try {
      await apiClient.patch(`/reports/${detail.id}/process`, {
        status: nextStatus,
        adminComment: adminComment || undefined,
      });
      message.success("신고 처리 결과가 저장되었습니다.");
      await mutate();
      closeDetail();
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    } finally {
      setProcessing(false);
    }
  };

  const columns = [
    {
      title: "신고유형",
      dataIndex: "type",
      key: "type",
      render: (type: ReportType) => TYPE_LABEL[type],
      sorter: { multiple: 1 },
    },
    { title: "모임명", dataIndex: "moimName", key: "moimName", sorter: { multiple: 2 } },
    {
      title: "신고자",
      dataIndex: "reporterNickname",
      key: "reporterNickname",
      sorter: { multiple: 3 },
    },
    {
      title: "피신고자",
      dataIndex: "reportedNickname",
      key: "reportedNickname",
      sorter: { multiple: 4 },
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      render: (status: ReportStatus) => <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>,
      sorter: { multiple: 5 },
    },
    {
      title: "신고일시",
      dataIndex: "createdAt",
      key: "createdAt",
      render: formatDateTime,
      sorter: { multiple: 6 },
    },
  ];

  return (
    <>
      {error && <ErrorAlert message="신고 목록을 불러오지 못했습니다." onRetry={() => mutate()} />}
      <DataTable<ReportListItem>
        title="신고관리"
        searchPlaceholder="모임명/닉네임 검색"
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
        title="신고 상세"
        open={detailId !== null}
        onCancel={closeDetail}
        onOk={handleProcess}
        okText="처리 저장"
        cancelText="닫기"
        okButtonProps={{ disabled: !nextStatus || isTerminal, loading: processing }}
        destroyOnHidden
        style={{ top: 20 }}
        styles={{ body: { maxHeight: "calc(100vh - 220px)", overflowY: "auto" } }}
      >
        {detailLoading || !detail ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin />
          </div>
        ) : (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="신고유형">{TYPE_LABEL[detail.type]}</Descriptions.Item>
              <Descriptions.Item label="제목">{detail.title}</Descriptions.Item>
              <Descriptions.Item label="내용">
                <div style={{ whiteSpace: "pre-wrap" }}>{detail.content}</div>
              </Descriptions.Item>
              <Descriptions.Item label="대상 모임">{detail.moimName}</Descriptions.Item>
              <Descriptions.Item label="신고자">
                <a onClick={() => setMemberDetailId(detail.reporterUserId)}>{detail.reporterNickname}</a>
              </Descriptions.Item>
              <Descriptions.Item label="피신고자">
                <a onClick={() => setMemberDetailId(detail.reportedUserId)}>{detail.reportedNickname}</a>
              </Descriptions.Item>
              <Descriptions.Item label="신고일시">{formatDateTime(detail.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="현재 상태">
                <Tag color={STATUS_COLOR[detail.status]}>{STATUS_LABEL[detail.status]}</Tag>
              </Descriptions.Item>
              {detail.processedAt && (
                <Descriptions.Item label="처리일시">{formatDateTime(detail.processedAt)}</Descriptions.Item>
              )}
              {detail.adminComment && (
                <Descriptions.Item label="처리 코멘트">{detail.adminComment}</Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>신고 처리</div>
              {isTerminal ? (
                <div>
                  <Tag color={STATUS_COLOR[detail.status]}>{STATUS_LABEL[detail.status]}</Tag>
                  처리 완료된 신고입니다. 더 이상 상태를 변경할 수 없습니다.
                </div>
              ) : (
                <Space orientation="vertical" style={{ width: "100%" }}>
                  <Select<ReportStatus>
                    placeholder="처리 결과 선택"
                    style={{ width: "100%" }}
                    value={nextStatus ?? undefined}
                    onChange={setNextStatus}
                    options={availableStatusOptions}
                  />
                  <Input.TextArea
                    placeholder="처리 코멘트 (선택)"
                    value={adminComment}
                    onChange={(event) => setAdminComment(event.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                </Space>
              )}
            </div>
          </>
        )}
      </Modal>

      <MemberDetailModal memberId={memberDetailId} onClose={() => setMemberDetailId(null)} />
    </>
  );
}
