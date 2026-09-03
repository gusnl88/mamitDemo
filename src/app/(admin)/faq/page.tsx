"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { App, Button, Form, Input, Modal, Popconfirm, Space, Switch } from "antd";
import type { FormInstance } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { DataTable } from "@/components/table/DataTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";

/** 실제 admin API(FaqResponse)와 동일. */
interface FaqRow {
  id: number;
  category: string;
  question: string;
  answer: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FaqFormValues {
  category: string;
  question: string;
  answer: string;
}

const formatDateTime = (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm");

export default function FaqPage() {
  const { message } = App.useApp();

  // 실제 admin API(AdminFaqController.list)는 페이지네이션도 keyword 검색도 없다
  // (전체를 id 역순으로 준다) — 그래서 클라이언트에서 직접 필터링한다.
  const { data, error, isLoading, mutate } = useSWR<FaqRow[]>("/faqs");
  const [keyword, setKeyword] = useState("");

  const filteredRows = useMemo(() => {
    const rows = data ?? [];
    if (!keyword.trim()) return rows;
    const lower = keyword.trim().toLowerCase();
    return rows.filter(
      (row) =>
        row.category.toLowerCase().includes(lower) || row.question.toLowerCase().includes(lower),
    );
  }, [data, keyword]);

  // ---------- 등록 ----------
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm<FaqFormValues>();

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      await apiClient.post("/faqs", values);
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
      await apiClient.patch(`/faqs/${editingRow.id}`, values);
      message.success("FAQ가 수정되었습니다.");
      await mutate();
      setEditingRow(null);
    } catch (err) {
      if (err instanceof ApiError) return;
    } finally {
      setUpdating(false);
    }
  };

  // ---------- 삭제/노출 토글 ----------
  const handleDelete = async (row: FaqRow) => {
    try {
      await apiClient.delete(`/faqs/${row.id}`);
      message.success("FAQ가 삭제되었습니다.");
      await mutate();
    } catch (err) {
      if (err instanceof ApiError) return;
    }
  };

  const handleToggleActive = async (row: FaqRow, isActive: boolean) => {
    try {
      await apiClient.put(`/faqs/${row.id}/active`, { isActive });
      message.success(isActive ? "FAQ를 노출 처리했습니다." : "FAQ를 비노출 처리했습니다.");
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
      sorter: (a: FaqRow, b: FaqRow) => a.category.localeCompare(b.category, "ko"),
    },
    {
      title: "질문",
      dataIndex: "question",
      key: "question",
      sorter: (a: FaqRow, b: FaqRow) => a.question.localeCompare(b.question, "ko"),
    },
    {
      title: "노출",
      key: "active",
      render: (_: unknown, row: FaqRow) => (
        <Switch checked={row.isActive} onChange={(checked) => handleToggleActive(row, checked)} />
      ),
    },
    {
      title: "수정일",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: formatDateTime,
      sorter: (a: FaqRow, b: FaqRow) => a.updatedAt.localeCompare(b.updatedAt),
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

  const renderForm = (form: FormInstance<FaqFormValues>) => (
    <Form<FaqFormValues> form={form} layout="vertical">
      <Form.Item
        name="category"
        label="카테고리"
        rules={[{ required: true, message: "카테고리를 입력해 주세요." }, { max: 50 }]}
      >
        <Input placeholder="예: 계정" />
      </Form.Item>
      <Form.Item
        name="question"
        label="질문"
        rules={[{ required: true, message: "질문을 입력해 주세요." }, { max: 300 }]}
      >
        <Input placeholder="질문" />
      </Form.Item>
      <Form.Item name="answer" label="답변" rules={[{ required: true, message: "답변을 입력해 주세요." }]}>
        <Input.TextArea placeholder="답변" rows={4} />
      </Form.Item>
    </Form>
  );

  return (
    <>
      {error && <ErrorAlert message="FAQ 목록을 불러오지 못했습니다." onRetry={() => mutate()} />}
      <DataTable<FaqRow>
        title="고객센터(FAQ)"
        searchPlaceholder="카테고리/질문 검색"
        searchValue={keyword}
        onSearchChange={setKeyword}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            등록
          </Button>
        }
        rowKey="id"
        columns={columns}
        dataSource={filteredRows}
        loading={isLoading}
      />

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
        {renderForm(createForm)}
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
        {renderForm(editForm)}
      </Modal>
    </>
  );
}
