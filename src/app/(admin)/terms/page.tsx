"use client";

import { useState } from "react";
import useSWR from "swr";
import { App, Button, DatePicker, Form, Input, Modal, Popconfirm, Space, Switch, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { DataTable } from "@/components/table/DataTable";
import type { SortSpec } from "@/components/table/DataTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";

interface TermsRow {
  id: number;
  code: string;
  title: string;
  version: string;
  required: boolean;
  contentUrl: string | null;
  effectiveAt: string;
  createdAt: string;
}

interface TermsPageResponse {
  content: TermsRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

interface CreateTermsFormValues {
  code: string;
  title: string;
  version: string;
  required: boolean;
  contentUrl?: string;
  effectiveAt: Dayjs;
}

interface EditTermsFormValues {
  title: string;
  required: boolean;
  contentUrl?: string;
  effectiveAt: Dayjs;
}

const PAGE_SIZE = 10;

const formatDateTime = (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm");

/** DataTable의 정렬 상태 → 백엔드 `sort` 쿼리 문자열("-effectiveAt,title" 형식). */
const toSortParam = (sorts: SortSpec[]) =>
  sorts.map((sort) => (sort.order === "descend" ? `-${sort.key}` : sort.key)).join(",");

export default function TermsPage() {
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [sorts, setSorts] = useState<SortSpec[]>([]);

  const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
  if (keyword) query.set("keyword", keyword);
  const sortParam = toSortParam(sorts);
  if (sortParam) query.set("sort", sortParam);

  const { data, error, isLoading, mutate } = useSWR<TermsPageResponse>(`/terms?${query.toString()}`);

  const handleSearchChange = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  const handleSortChange = (nextSorts: SortSpec[]) => {
    setSorts(nextSorts);
    setPage(1);
  };

  // ---------- 등록 ----------
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm<CreateTermsFormValues>();

  const openCreateModal = () => {
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      await apiClient.post("/terms", {
        code: values.code,
        title: values.title,
        version: values.version,
        required: values.required,
        contentUrl: values.contentUrl,
        effectiveAt: values.effectiveAt.toISOString(),
      });
      message.success("약관이 등록되었습니다.");
      await mutate();
      setCreateOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        // 응답 인터셉터가 이미 message.error로 표시함
        return;
      }
      // 폼 검증 에러도 여기로 떨어지는데, antd가 이미 문제 필드를 강조해주므로 더 할 일 없음.
    } finally {
      setCreating(false);
    }
  };

  // ---------- 수정 ----------
  const [editingRow, setEditingRow] = useState<TermsRow | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editForm] = Form.useForm<EditTermsFormValues>();

  const openEditModal = (row: TermsRow) => {
    setEditingRow(row);
    editForm.setFieldsValue({
      title: row.title,
      required: row.required,
      contentUrl: row.contentUrl ?? undefined,
      effectiveAt: dayjs(row.effectiveAt),
    });
  };

  const handleUpdate = async () => {
    if (!editingRow) return;
    try {
      const values = await editForm.validateFields();
      setUpdating(true);
      await apiClient.put(`/terms/${editingRow.id}`, {
        title: values.title,
        required: values.required,
        contentUrl: values.contentUrl,
        effectiveAt: values.effectiveAt.toISOString(),
      });
      message.success("약관이 수정되었습니다.");
      await mutate();
      setEditingRow(null);
    } catch (err) {
      if (err instanceof ApiError) return;
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (row: TermsRow) => {
    try {
      await apiClient.delete(`/terms/${row.id}`);
      message.success("약관이 삭제되었습니다.");
      await mutate();
    } catch (err) {
      if (err instanceof ApiError) return;
    }
  };

  const columns = [
    { title: "코드", dataIndex: "code", key: "code", sorter: { multiple: 1 } },
    { title: "타이틀", dataIndex: "title", key: "title", sorter: { multiple: 2 } },
    { title: "버전", dataIndex: "version", key: "version", sorter: { multiple: 3 } },
    {
      title: "필수여부",
      dataIndex: "required",
      key: "required",
      render: (required: boolean) => (
        <Tag color={required ? "red" : "default"}>{required ? "필수" : "선택"}</Tag>
      ),
      sorter: { multiple: 4 },
    },
    {
      title: "시행일",
      dataIndex: "effectiveAt",
      key: "effectiveAt",
      render: formatDateTime,
      sorter: { multiple: 5 },
    },
    {
      title: "관리",
      key: "actions",
      render: (_: unknown, row: TermsRow) => (
        <Space>
          <Button size="small" onClick={() => openEditModal(row)}>
            수정
          </Button>
          <Popconfirm
            title="정말 삭제하시겠습니까?"
            onConfirm={() => handleDelete(row)}
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
  ];

  return (
    <>
      {error && <ErrorAlert message="약관 목록을 불러오지 못했습니다." onRetry={() => mutate()} />}
      <DataTable<TermsRow>
        title="약관관리"
        searchPlaceholder="코드/타이틀 검색"
        searchValue={keyword}
        onSearchChange={handleSearchChange}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            등록
          </Button>
        }
        rowKey="id"
        columns={columns}
        dataSource={data?.content ?? []}
        loading={isLoading}
        serverSide
        total={data?.totalElements}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSortChange={handleSortChange}
      />

      <Modal
        title="약관 등록"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={creating}
        destroyOnHidden
        okText="등록"
        cancelText="취소"
      >
        <Form<CreateTermsFormValues>
          form={createForm}
          layout="vertical"
          initialValues={{ required: false }}
        >
          <Form.Item
            name="code"
            label="코드"
            rules={[{ required: true, message: "코드를 입력해 주세요." }]}
          >
            <Input placeholder="예: TERMS_OF_SERVICE" autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="title"
            label="타이틀"
            rules={[{ required: true, message: "타이틀을 입력해 주세요." }]}
          >
            <Input placeholder="타이틀" />
          </Form.Item>
          <Form.Item
            name="version"
            label="버전"
            rules={[{ required: true, message: "버전을 입력해 주세요." }]}
          >
            <Input placeholder="예: v1" autoComplete="off" />
          </Form.Item>
          <Form.Item name="required" label="필수 동의 여부" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="contentUrl" label="약관 본문 URL">
            <Input placeholder="https://..." autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="effectiveAt"
            label="시행일시"
            rules={[{ required: true, message: "시행일시를 선택해 주세요." }]}
          >
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="약관 수정"
        open={editingRow !== null}
        onOk={handleUpdate}
        onCancel={() => setEditingRow(null)}
        confirmLoading={updating}
        destroyOnHidden
        okText="저장"
        cancelText="취소"
      >
        {editingRow && (
          <div style={{ marginBottom: 16, color: "rgba(0, 0, 0, 0.45)" }}>
            코드: {editingRow.code} · 버전: {editingRow.version} (등록 후에는 변경할 수 없습니다)
          </div>
        )}
        <Form<EditTermsFormValues> form={editForm} layout="vertical">
          <Form.Item
            name="title"
            label="타이틀"
            rules={[{ required: true, message: "타이틀을 입력해 주세요." }]}
          >
            <Input placeholder="타이틀" />
          </Form.Item>
          <Form.Item name="required" label="필수 동의 여부" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="contentUrl" label="약관 본문 URL">
            <Input placeholder="https://..." autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="effectiveAt"
            label="시행일시"
            rules={[{ required: true, message: "시행일시를 선택해 주세요." }]}
          >
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
