"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, PlusOutlined, TagsOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { DataTable } from "@/components/table/DataTable";
import type { SortSpec } from "@/components/table/DataTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";

interface FaqRow {
  id: number;
  category: string;
  question: string;
  answer: string;
  displayOrder: number;
  createdAt: string;
}

interface FaqPageResponse {
  content: FaqRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

interface FaqFormValues {
  category: string;
  question: string;
  answer: string;
}

const PAGE_SIZE = 10;

const formatDate = (value: string) => dayjs(value).format("YYYY-MM-DD");

/** DataTable의 정렬 상태 → 백엔드 `sort` 쿼리 문자열("-displayOrder,question" 형식). */
const toSortParam = (sorts: SortSpec[]) =>
  sorts.map((sort) => (sort.order === "descend" ? `-${sort.key}` : sort.key)).join(",");

export default function FaqPage() {
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [sorts, setSorts] = useState<SortSpec[]>([]);

  const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
  if (keyword) query.set("keyword", keyword);
  const sortParam = toSortParam(sorts);
  if (sortParam) query.set("sort", sortParam);

  const { data, error, isLoading, mutate } = useSWR<FaqPageResponse>(`/faq?${query.toString()}`);
  const { data: categories, mutate: mutateCategories } = useSWR<string[]>("/faq/categories");

  const handleSearchChange = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  const handleSortChange = (nextSorts: SortSpec[]) => {
    setSorts(nextSorts);
    setPage(1);
  };

  const categoryOptions = (categories ?? []).map((category) => ({
    value: category,
    label: category,
  }));

  // ---------- 카테고리 관리 ----------
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    try {
      setAddingCategory(true);
      await apiClient.post("/faq/categories", { name });
      message.success("카테고리가 추가되었습니다.");
      setNewCategory("");
      await mutateCategories();
    } catch (err) {
      if (err instanceof ApiError) return;
    } finally {
      setAddingCategory(false);
    }
  };

  const handleRemoveCategory = async (name: string) => {
    try {
      await apiClient.delete(`/faq/categories/${encodeURIComponent(name)}`);
      message.success("카테고리가 삭제되었습니다.");
      await mutateCategories();
    } catch (err) {
      if (err instanceof ApiError) return;
    }
  };

  // ---------- 등록 ----------
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm<FaqFormValues>();

  const openCreateModal = () => {
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      await apiClient.post("/faq", values);
      message.success("FAQ가 등록되었습니다.");
      await mutate();
      setCreateOpen(false);
    } catch (err) {
      if (err instanceof ApiError) return;
    } finally {
      setCreating(false);
    }
  };

  // ---------- 수정 ----------
  const [editingRow, setEditingRow] = useState<FaqRow | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editForm] = Form.useForm<FaqFormValues>();

  const openEditModal = (row: FaqRow) => {
    setEditingRow(row);
    editForm.setFieldsValue({
      category: row.category,
      question: row.question,
      answer: row.answer,
    });
  };

  const handleUpdate = async () => {
    if (!editingRow) return;
    try {
      const values = await editForm.validateFields();
      setUpdating(true);
      await apiClient.put(`/faq/${editingRow.id}`, values);
      message.success("FAQ가 수정되었습니다.");
      await mutate();
      setEditingRow(null);
    } catch (err) {
      if (err instanceof ApiError) return;
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (row: FaqRow) => {
    try {
      await apiClient.delete(`/faq/${row.id}`);
      message.success("FAQ가 삭제되었습니다.");
      await mutate();
    } catch (err) {
      if (err instanceof ApiError) return;
    }
  };

  const handleMove = async (row: FaqRow, direction: "up" | "down") => {
    try {
      await apiClient.patch(`/faq/${row.id}/move-${direction}`);
      await mutate();
    } catch (err) {
      if (err instanceof ApiError) return;
    }
  };

  const columns = [
    {
      title: "카테고리",
      dataIndex: "category",
      key: "category",
      render: (category: string) => <Tag>{category}</Tag>,
      sorter: { multiple: 1 },
    },
    { title: "질문", dataIndex: "question", key: "question", sorter: { multiple: 2 } },
    {
      title: "답변",
      dataIndex: "answer",
      key: "answer",
      render: (answer: string) => (
        <Typography.Text ellipsis={{ tooltip: answer }} style={{ maxWidth: 320, display: "block" }}>
          {answer}
        </Typography.Text>
      ),
    },
    {
      title: "노출순서",
      dataIndex: "displayOrder",
      key: "displayOrder",
      render: (order: number, row: FaqRow) => (
        <Space size={4}>
          {order}
          <Button size="small" type="text" icon={<ArrowUpOutlined />} onClick={() => handleMove(row, "up")} />
          <Button
            size="small"
            type="text"
            icon={<ArrowDownOutlined />}
            onClick={() => handleMove(row, "down")}
          />
        </Space>
      ),
      sorter: { multiple: 3 },
    },
    {
      title: "등록일",
      dataIndex: "createdAt",
      key: "createdAt",
      render: formatDate,
      sorter: { multiple: 4 },
    },
    {
      title: "관리",
      key: "actions",
      render: (_: unknown, row: FaqRow) => (
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
      {error && <ErrorAlert message="FAQ 목록을 불러오지 못했습니다." onRetry={() => mutate()} />}
      <DataTable<FaqRow>
        title="고객센터(FAQ) 관리"
        searchPlaceholder="질문/카테고리 검색"
        searchValue={keyword}
        onSearchChange={handleSearchChange}
        actions={
          <Space>
            <Button icon={<TagsOutlined />} onClick={() => setCategoryModalOpen(true)}>
              카테고리 관리
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              등록
            </Button>
          </Space>
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
        title="카테고리 관리"
        open={categoryModalOpen}
        onCancel={() => setCategoryModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(categories ?? []).map((category) => (
            <Tag key={category} closable onClose={() => handleRemoveCategory(category)}>
              {category}
            </Tag>
          ))}
        </div>
        <Space.Compact style={{ width: "100%" }}>
          <Input
            placeholder="새 카테고리 이름"
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            onPressEnter={handleAddCategory}
          />
          <Button type="primary" loading={addingCategory} onClick={handleAddCategory}>
            추가
          </Button>
        </Space.Compact>
      </Modal>

      <Modal
        title="FAQ 등록"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={creating}
        destroyOnHidden
        okText="등록"
        cancelText="취소"
      >
        <Form<FaqFormValues> form={createForm} layout="vertical">
          <Form.Item
            name="category"
            label="카테고리"
            rules={[{ required: true, message: "카테고리를 선택해 주세요." }]}
          >
            <Select placeholder="카테고리 선택" options={categoryOptions} />
          </Form.Item>
          <Form.Item
            name="question"
            label="질문"
            rules={[{ required: true, message: "질문을 입력해 주세요." }]}
          >
            <Input placeholder="질문" />
          </Form.Item>
          <Form.Item
            name="answer"
            label="답변"
            rules={[{ required: true, message: "답변을 입력해 주세요." }]}
          >
            <Input.TextArea placeholder="답변" rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="FAQ 수정"
        open={editingRow !== null}
        onOk={handleUpdate}
        onCancel={() => setEditingRow(null)}
        confirmLoading={updating}
        destroyOnHidden
        okText="저장"
        cancelText="취소"
      >
        <Form<FaqFormValues> form={editForm} layout="vertical">
          <Form.Item
            name="category"
            label="카테고리"
            rules={[{ required: true, message: "카테고리를 선택해 주세요." }]}
          >
            <Select placeholder="카테고리 선택" options={categoryOptions} />
          </Form.Item>
          <Form.Item
            name="question"
            label="질문"
            rules={[{ required: true, message: "질문을 입력해 주세요." }]}
          >
            <Input placeholder="질문" />
          </Form.Item>
          <Form.Item
            name="answer"
            label="답변"
            rules={[{ required: true, message: "답변을 입력해 주세요." }]}
          >
            <Input.TextArea placeholder="답변" rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
