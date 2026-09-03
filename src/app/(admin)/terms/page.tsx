"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { App, Button, DatePicker, Form, Input, Modal, Popconfirm, Space, Switch, Tag, Typography, Upload } from "antd";
import { PlusOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { DataTable } from "@/components/table/DataTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";

/** 실제 admin API(AdminTermsResponse)와 동일 — code별로 여러 버전(개정 이력)이 행으로 온다. */
interface TermsRow {
  id: number;
  code: string;
  title: string;
  version: string;
  required: boolean;
  contentUrl: string;
  effectiveAt: string;
  isActive: boolean;
}

interface AddTermsVersionFormValues {
  code: string;
  version: string;
  title: string;
  required: boolean;
  effectiveAt?: Dayjs;
  file: { file: File; originFileObj?: File }[];
}

const formatDateTime = (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm");

export default function TermsPage() {
  const { message } = App.useApp();

  // 실제 admin API(AdminTermsController.list)는 페이지네이션도 keyword 검색도 없다 —
  // code별 개정 이력을 전부 내려주므로 클라이언트에서 직접 필터링한다.
  const { data, error, isLoading, mutate } = useSWR<TermsRow[]>("/terms");
  const [keyword, setKeyword] = useState("");

  const filteredRows = useMemo(() => {
    const rows = data ?? [];
    if (!keyword.trim()) return rows;
    const lower = keyword.trim().toLowerCase();
    return rows.filter(
      (row) => row.code.toLowerCase().includes(lower) || row.title.toLowerCase().includes(lower),
    );
  }, [data, keyword]);

  // ---------- 개정본 등록 (새 약관 / 기존 코드에 새 버전) ----------
  const [modalOpen, setModalOpen] = useState(false);
  const [existingCode, setExistingCode] = useState<{
    code: string;
    title: string;
    required: boolean;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<AddTermsVersionFormValues>();

  useEffect(() => {
    if (!modalOpen) return;
    form.resetFields();
    form.setFieldsValue({
      code: existingCode?.code ?? "",
      title: existingCode?.title ?? "",
      required: existingCode?.required ?? false,
    });
  }, [modalOpen, existingCode, form]);

  const openNewCodeModal = () => {
    setExistingCode(null);
    setModalOpen(true);
  };

  const openNewVersionModal = (row: TermsRow) => {
    setExistingCode({ code: row.code, title: row.title, required: row.required });
    setModalOpen(true);
  };

  const handleAddVersion = async () => {
    try {
      const values = await form.validateFields();
      const file = values.file?.[0]?.originFileObj;
      if (!file) {
        message.error("약관 문서를 첨부해 주세요.");
        return;
      }
      setSubmitting(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("version", values.version);
      formData.append("title", values.title);
      formData.append("required", String(values.required));
      if (values.effectiveAt) {
        formData.append("effectiveAt", values.effectiveAt.toISOString());
      }
      await apiClient.post(`/terms/${values.code}/versions`, formData);
      message.success("약관 개정본이 등록되었습니다.");
      await mutate();
      setModalOpen(false);
    } catch (err) {
      if (err instanceof ApiError) return;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVersion = async (row: TermsRow) => {
    try {
      await apiClient.delete(`/terms/${row.code}/versions/${row.version}`);
      message.success("약관 개정본이 삭제되었습니다.");
      await mutate();
    } catch (err) {
      if (err instanceof ApiError) return;
    }
  };

  const columns = [
    { title: "코드", dataIndex: "code", key: "code" },
    { title: "타이틀", dataIndex: "title", key: "title" },
    { title: "버전", dataIndex: "version", key: "version" },
    {
      title: "필수여부",
      dataIndex: "required",
      key: "required",
      render: (required: boolean) => (
        <Tag color={required ? "red" : "default"}>{required ? "필수" : "선택"}</Tag>
      ),
    },
    { title: "발효일", dataIndex: "effectiveAt", key: "effectiveAt", render: formatDateTime },
    {
      title: "상태",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => (
        <Tag color={isActive ? "green" : "default"}>{isActive ? "노출중" : "이전 버전"}</Tag>
      ),
    },
    {
      title: "문서",
      dataIndex: "contentUrl",
      key: "contentUrl",
      render: (contentUrl: string) => (
        <Typography.Link href={contentUrl} target="_blank" rel="noreferrer">
          열기
        </Typography.Link>
      ),
    },
    {
      title: "관리",
      key: "actions",
      render: (_: unknown, row: TermsRow) => (
        <Space>
          <Button size="small" onClick={() => openNewVersionModal(row)}>
            새 버전
          </Button>
          <Popconfirm
            title="이 버전을 삭제하시겠습니까?"
            description="이미 동의한 사용자가 있으면 삭제할 수 없습니다."
            onConfirm={() => handleDeleteVersion(row)}
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
        onSearchChange={setKeyword}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openNewCodeModal}>
            새 약관 등록
          </Button>
        }
        rowKey="id"
        columns={columns}
        dataSource={filteredRows}
        loading={isLoading}
      />

      <Modal
        title={existingCode ? `약관 개정본 등록 (${existingCode.code})` : "새 약관 등록"}
        open={modalOpen}
        onOk={handleAddVersion}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnHidden
        okText="등록"
        cancelText="취소"
      >
        <Form<AddTermsVersionFormValues> form={form} layout="vertical">
          <Form.Item
            name="code"
            label="약관 코드"
            rules={[{ required: true, message: "약관 코드를 입력해 주세요." }]}
          >
            <Input placeholder="예: TERMS_OF_SERVICE" autoComplete="off" disabled={!!existingCode} />
          </Form.Item>
          <Form.Item
            name="version"
            label="버전"
            rules={[{ required: true, message: "버전을 입력해 주세요." }]}
          >
            <Input placeholder="예: 1.1" autoComplete="off" />
          </Form.Item>
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
          <Form.Item name="effectiveAt" label="발효 일시" extra="비워두면 즉시 발효됩니다.">
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="file"
            label="약관 문서 (html · pdf · txt)"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
            rules={[{ required: true, message: "약관 문서를 첨부해 주세요." }]}
          >
            <Upload
              accept=".html,.pdf,.txt,text/html,application/pdf,text/plain"
              beforeUpload={() => false}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>파일 선택</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
