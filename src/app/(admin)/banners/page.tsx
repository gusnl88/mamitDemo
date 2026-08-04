"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  App,
  Button,
  DatePicker,
  Form,
  Image,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  Upload,
} from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { DataTable } from "@/components/table/DataTable";
import type { SortSpec } from "@/components/table/DataTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";

type BannerCategory = "HOME" | "MOIM" | "CHAT";
type BannerStatus = "ACTIVE" | "SCHEDULED" | "ENDED" | "INACTIVE";

interface BannerRow {
  id: number;
  category: BannerCategory;
  title: string;
  description: string | null;
  imageUrl: string;
  targetUrl: string | null;
  startDate: string;
  endDate: string;
  displayOrder: number | null;
  active: boolean;
  status: BannerStatus;
}

interface BannerPageResponse {
  content: BannerRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

interface CreateBannerFormValues {
  category: BannerCategory;
  title: string;
  description?: string;
  targetUrl?: string;
  period: [Dayjs, Dayjs];
}

interface EditBannerFormValues {
  title: string;
  description?: string;
  targetUrl?: string;
  period: [Dayjs, Dayjs];
}

const PAGE_SIZE = 10;

const CATEGORY_LABEL: Record<BannerCategory, string> = {
  HOME: "홈",
  MOIM: "모임",
  CHAT: "채팅",
};
const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABEL) as BannerCategory[]).map((value) => ({
  value,
  label: CATEGORY_LABEL[value],
}));

const STATUS_LABEL: Record<BannerStatus, string> = {
  ACTIVE: "노출중",
  SCHEDULED: "노출예정",
  ENDED: "노출종료",
  INACTIVE: "비활성",
};

const STATUS_COLOR: Record<BannerStatus, string> = {
  ACTIVE: "green",
  SCHEDULED: "blue",
  ENDED: "default",
  INACTIVE: "red",
};

const formatDate = (value: string) => dayjs(value).format("YYYY-MM-DD");

/** DataTable의 정렬 상태 → 백엔드 `sort` 쿼리 문자열("-status,title" 형식). */
const toSortParam = (sorts: SortSpec[]) =>
  sorts.map((sort) => (sort.order === "descend" ? `-${sort.key}` : sort.key)).join(",");

export default function BannersPage() {
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [sorts, setSorts] = useState<SortSpec[]>([]);

  const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
  if (keyword) query.set("keyword", keyword);
  const sortParam = toSortParam(sorts);
  if (sortParam) query.set("sort", sortParam);

  const { data, error, isLoading, mutate } = useSWR<BannerPageResponse>(`/banners?${query.toString()}`);

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
  const [createForm] = Form.useForm<CreateBannerFormValues>();
  const [createImageUrl, setCreateImageUrl] = useState<string | null>(null);
  const [createImageUploading, setCreateImageUploading] = useState(false);

  const openCreateModal = () => {
    setCreateImageUrl(null);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      if (!createImageUrl) {
        message.error("배너 이미지를 업로드해 주세요.");
        return;
      }
      setCreating(true);
      await apiClient.post("/banners", {
        category: values.category,
        title: values.title,
        description: values.description,
        imageUrl: createImageUrl,
        targetUrl: values.targetUrl,
        startDate: values.period[0].format("YYYY-MM-DD"),
        endDate: values.period[1].format("YYYY-MM-DD"),
      });
      message.success("배너가 등록되었습니다.");
      await mutate();
      setCreateOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        // 응답 인터셉터가 이미 message.error로 표시했음.
        return;
      }
      // 폼 검증 에러도 여기로 떨어지는데, antd가 이미 문제 필드를 강조해주므로 더 할 일 없음.
    } finally {
      setCreating(false);
    }
  };

  // ---------- 수정 ----------
  const [editingRow, setEditingRow] = useState<BannerRow | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editForm] = Form.useForm<EditBannerFormValues>();
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editImageUploading, setEditImageUploading] = useState(false);

  const openEditModal = (row: BannerRow) => {
    setEditingRow(row);
    setEditImageUrl(row.imageUrl);
    editForm.setFieldsValue({
      title: row.title,
      description: row.description ?? undefined,
      targetUrl: row.targetUrl ?? undefined,
      period: [dayjs(row.startDate), dayjs(row.endDate)],
    });
  };

  const handleUpdate = async () => {
    if (!editingRow) return;
    try {
      const values = await editForm.validateFields();
      if (!editImageUrl) {
        message.error("배너 이미지를 업로드해 주세요.");
        return;
      }
      setUpdating(true);
      await apiClient.put(`/banners/${editingRow.id}`, {
        title: values.title,
        description: values.description,
        imageUrl: editImageUrl,
        targetUrl: values.targetUrl,
        startDate: values.period[0].format("YYYY-MM-DD"),
        endDate: values.period[1].format("YYYY-MM-DD"),
      });
      message.success("배너가 수정되었습니다.");
      await mutate();
      setEditingRow(null);
    } catch (err) {
      if (err instanceof ApiError) {
        return;
      }
    } finally {
      setUpdating(false);
    }
  };

  // ---------- 삭제/노출 토글/순서 변경 ----------
  const handleDelete = async (row: BannerRow) => {
    try {
      await apiClient.delete(`/banners/${row.id}`);
      message.success("배너가 삭제되었습니다.");
      await mutate();
    } catch (err) {
      if (err instanceof ApiError) return;
    }
  };

  const handleToggleActive = async (row: BannerRow, active: boolean) => {
    try {
      await apiClient.patch(`/banners/${row.id}/active`, { active });
      message.success(active ? "배너를 노출 처리했습니다." : "배너를 비노출 처리했습니다.");
      await mutate();
    } catch (err) {
      if (err instanceof ApiError) return;
    }
  };

  const handleMove = async (row: BannerRow, direction: "up" | "down") => {
    try {
      await apiClient.patch(`/banners/${row.id}/move-${direction}`);
      await mutate();
    } catch (err) {
      if (err instanceof ApiError) return;
    }
  };

  const columns = [
    { title: "타이틀", dataIndex: "title", key: "title", sorter: { multiple: 1 } },
    {
      title: "카테고리",
      dataIndex: "category",
      key: "category",
      render: (category: BannerCategory) => CATEGORY_LABEL[category],
      sorter: { multiple: 2 },
    },
    {
      title: "노출기간",
      dataIndex: "startDate",
      key: "startDate",
      render: (_: string, row: BannerRow) => `${formatDate(row.startDate)} ~ ${formatDate(row.endDate)}`,
      sorter: { multiple: 3 },
    },
    {
      title: "노출상태",
      dataIndex: "status",
      key: "status",
      render: (status: BannerStatus) => <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>,
      sorter: { multiple: 4 },
    },
    {
      title: "노출순서",
      dataIndex: "displayOrder",
      key: "displayOrder",
      render: (order: number | null, row: BannerRow) =>
        order == null ? (
          "-"
        ) : (
          <Space size={4}>
            {order}
            <Button
              size="small"
              type="text"
              icon={<ArrowUpOutlined />}
              onClick={() => handleMove(row, "up")}
            />
            <Button
              size="small"
              type="text"
              icon={<ArrowDownOutlined />}
              onClick={() => handleMove(row, "down")}
            />
          </Space>
        ),
      sorter: { multiple: 5 },
    },
    {
      title: "노출",
      key: "active",
      render: (_: unknown, row: BannerRow) => (
        <Switch
          checked={row.active}
          onChange={(checked) => handleToggleActive(row, checked)}
        />
      ),
    },
    {
      title: "관리",
      key: "actions",
      render: (_: unknown, row: BannerRow) => (
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
      {error && <ErrorAlert message="배너 목록을 불러오지 못했습니다." onRetry={() => mutate()} />}
      <DataTable<BannerRow>
        title="배너관리"
        searchPlaceholder="타이틀 검색"
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
        title="배너 등록"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={creating}
        destroyOnHidden
        okText="등록"
        cancelText="취소"
      >
        <Form<CreateBannerFormValues> form={createForm} layout="vertical">
          <Form.Item
            name="category"
            label="카테고리"
            rules={[{ required: true, message: "카테고리를 선택해 주세요." }]}
          >
            <Select placeholder="카테고리 선택" options={CATEGORY_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="title"
            label="타이틀"
            rules={[{ required: true, message: "타이틀을 입력해 주세요." }]}
          >
            <Input placeholder="타이틀" />
          </Form.Item>
          <Form.Item name="description" label="설명">
            <Input.TextArea placeholder="설명 (선택)" rows={2} />
          </Form.Item>
          <Form.Item label="이미지" required>
            <Space>
              <Upload
                accept="image/png,image/jpeg,image/webp,image/gif"
                showUploadList={false}
                customRequest={async (options) => {
                  const { file, onSuccess, onError } = options;
                  setCreateImageUploading(true);
                  try {
                    const formData = new FormData();
                    formData.append("file", file as File);
                    const { data: uploadData } = await apiClient.post<{ imageUrl: string }>(
                      "/banners/upload-image",
                      formData,
                      { headers: { "Content-Type": "multipart/form-data" } },
                    );
                    setCreateImageUrl(uploadData.imageUrl);
                    onSuccess?.(uploadData);
                  } catch (uploadErr) {
                    onError?.(uploadErr as Error);
                  } finally {
                    setCreateImageUploading(false);
                  }
                }}
              >
                <Button icon={<UploadOutlined />} loading={createImageUploading}>
                  이미지 업로드
                </Button>
              </Upload>
              {createImageUrl && <Image src={createImageUrl} alt="배너 미리보기" width={80} />}
            </Space>
          </Form.Item>
          <Form.Item name="targetUrl" label="연결 링크">
            <Input placeholder="https://..." autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="period"
            label="노출기간"
            rules={[{ required: true, message: "노출기간을 선택해 주세요." }]}
          >
            <DatePicker.RangePicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="배너 수정"
        open={editingRow !== null}
        onOk={handleUpdate}
        onCancel={() => setEditingRow(null)}
        confirmLoading={updating}
        destroyOnHidden
        okText="저장"
        cancelText="취소"
      >
        <Form<EditBannerFormValues> form={editForm} layout="vertical">
          <Form.Item
            name="title"
            label="타이틀"
            rules={[{ required: true, message: "타이틀을 입력해 주세요." }]}
          >
            <Input placeholder="타이틀" />
          </Form.Item>
          <Form.Item name="description" label="설명">
            <Input.TextArea placeholder="설명 (선택)" rows={2} />
          </Form.Item>
          <Form.Item label="이미지" required>
            <Space>
              <Upload
                accept="image/png,image/jpeg,image/webp,image/gif"
                showUploadList={false}
                customRequest={async (options) => {
                  const { file, onSuccess, onError } = options;
                  setEditImageUploading(true);
                  try {
                    const formData = new FormData();
                    formData.append("file", file as File);
                    const { data: uploadData } = await apiClient.post<{ imageUrl: string }>(
                      "/banners/upload-image",
                      formData,
                      { headers: { "Content-Type": "multipart/form-data" } },
                    );
                    setEditImageUrl(uploadData.imageUrl);
                    onSuccess?.(uploadData);
                  } catch (uploadErr) {
                    onError?.(uploadErr as Error);
                  } finally {
                    setEditImageUploading(false);
                  }
                }}
              >
                <Button icon={<UploadOutlined />} loading={editImageUploading}>
                  이미지 변경
                </Button>
              </Upload>
              {editImageUrl && <Image src={editImageUrl} alt="배너 미리보기" width={80} />}
            </Space>
          </Form.Item>
          <Form.Item name="targetUrl" label="연결 링크">
            <Input placeholder="https://..." autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="period"
            label="노출기간"
            rules={[{ required: true, message: "노출기간을 선택해 주세요." }]}
          >
            <DatePicker.RangePicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
