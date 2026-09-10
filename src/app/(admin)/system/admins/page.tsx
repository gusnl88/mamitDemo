"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { App, Button, Form, Input, Modal, Popconfirm, Select, Space, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { RequireRole } from "@/components/auth/RequireRole";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { DataTable } from "@/components/table/DataTable";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { ROLE_LABEL, type Role } from "@/types/auth";
import { ApiError } from "@/types/api";
import { PERMISSION, hasPermission } from "@/lib/auth/permissions";

/** 실제 admin API(AdminAccountResponse)와 동일 — 휴대폰 없음, 상태/임시비밀번호/최근로그인 포함. */
interface AdminAccountRow {
  id: number;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
  status: "ACTIVE" | "SUSPENDED";
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

interface CreateAdminFormValues {
  name: string;
  email: string;
  role: Role;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = (
  ["SUPER_ADMIN", "OPERATOR", "CONTENT", "VIEWER"] as Role[]
).map((role) => ({ value: role, label: ROLE_LABEL[role] }));

const formatDateTime = (value: string | null) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-";

function AdminAccountsPage() {
  const { message } = App.useApp();
  const currentUser = useAuthStore((state) => state.user);

  // 실제 admin API(AdminAccountController.list)는 페이지네이션도 keyword 검색도 없다 —
  // 전체 목록을 받아 클라이언트에서 직접 필터링한다.
  const { data, error, isLoading, mutate } = useSWR<AdminAccountRow[]>("/accounts");
  const [keyword, setKeyword] = useState("");

  const filteredRows = useMemo(() => {
    const rows = data ?? [];
    if (!keyword.trim()) return rows;
    const lower = keyword.trim().toLowerCase();
    return rows.filter(
      (row) => row.name.toLowerCase().includes(lower) || row.email.toLowerCase().includes(lower),
    );
  }, [data, keyword]);

  const canCreate = hasPermission(currentUser?.role, PERMISSION.ADMIN_CREATE);

  // ---------- 등록 ----------
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm<CreateAdminFormValues>();

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      await apiClient.post("/accounts", values);
      message.success("관리자 계정이 등록되었습니다. 임시 비밀번호는 본인 메일로 발송됩니다.");
      await mutate();
      setCreateOpen(false);
      createForm.resetFields();
    } catch (err) {
      if (err instanceof ApiError) return;
    } finally {
      setCreating(false);
    }
  };

  // ---------- 역할 변경 / 정지·활성화 / 임시비밀번호 재발급 ----------
  // 실제 API와 동일: 본인의 역할·상태는 못 바꾸고, 서버가 최후의 활성 SUPER_ADMIN 보호도 강제한다.
  const [roleChangingId, setRoleChangingId] = useState<number | null>(null);
  const [statusChangingId, setStatusChangingId] = useState<number | null>(null);
  const [resettingId, setResettingId] = useState<number | null>(null);

  const handleChangeRole = async (row: AdminAccountRow, role: Role) => {
    if (role === row.role) return;
    try {
      setRoleChangingId(row.id);
      await apiClient.patch(`/accounts/${row.id}/role`, { role });
      message.success("역할이 변경되었습니다.");
      await mutate();
    } catch (err) {
      if (err instanceof ApiError) return;
    } finally {
      setRoleChangingId(null);
    }
  };

  const handleChangeStatus = async (row: AdminAccountRow, active: boolean) => {
    try {
      setStatusChangingId(row.id);
      await apiClient.patch(`/accounts/${row.id}/status`, { active });
      message.success(active ? "계정을 활성화했습니다." : "계정을 정지했습니다.");
      await mutate();
    } catch (err) {
      if (err instanceof ApiError) return;
    } finally {
      setStatusChangingId(null);
    }
  };

  const handleResetPassword = async (row: AdminAccountRow) => {
    try {
      setResettingId(row.id);
      await apiClient.post(`/accounts/${row.id}/password-reset`);
      message.success("임시 비밀번호를 재발급해 본인 메일로 보냈습니다.");
      await mutate();
    } catch (err) {
      if (err instanceof ApiError) return;
    } finally {
      setResettingId(null);
    }
  };

  const columns = [
    { title: "이메일", dataIndex: "email", key: "email" },
    { title: "이름", dataIndex: "name", key: "name" },
    {
      title: "역할",
      dataIndex: "role",
      key: "role",
      render: (role: Role, row: AdminAccountRow) => (
        <Select<Role>
          value={role}
          options={ROLE_OPTIONS}
          disabled={row.email === currentUser?.email}
          loading={roleChangingId === row.id}
          style={{ width: 140 }}
          onChange={(value) => handleChangeRole(row, value)}
        />
      ),
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      render: (status: "ACTIVE" | "SUSPENDED", row: AdminAccountRow) => (
        <Space>
          <Tag color={status === "ACTIVE" ? "green" : "red"}>
            {status === "ACTIVE" ? "활성" : "정지"}
          </Tag>
          {row.email !== currentUser?.email && (
            <Button
              size="small"
              loading={statusChangingId === row.id}
              onClick={() => handleChangeStatus(row, status !== "ACTIVE")}
            >
              {status === "ACTIVE" ? "정지" : "활성화"}
            </Button>
          )}
        </Space>
      ),
    },
    {
      title: "임시 비밀번호",
      dataIndex: "mustChangePassword",
      key: "mustChangePassword",
      render: (mustChangePassword: boolean) =>
        mustChangePassword ? <Tag color="gold">최초 로그인 대기</Tag> : "-",
    },
    {
      title: "최근 로그인",
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      render: formatDateTime,
    },
    {
      title: "관리",
      key: "actions",
      render: (_: unknown, row: AdminAccountRow) => (
        <Popconfirm
          title="임시 비밀번호를 재발급하시겠습니까?"
          description="새 임시 비밀번호가 본인 메일로 발송됩니다."
          onConfirm={() => handleResetPassword(row)}
          okText="재발급"
          cancelText="취소"
        >
          <Button size="small" loading={resettingId === row.id}>
            비밀번호 재발급
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      {error && <ErrorAlert message="관리자 목록을 불러오지 못했습니다." onRetry={() => mutate()} />}
      <DataTable<AdminAccountRow>
        title="관리자 계정 관리"
        searchPlaceholder="이름/이메일 검색"
        searchValue={keyword}
        onSearchChange={setKeyword}
        actions={
          canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              등록
            </Button>
          )
        }
        rowKey="id"
        columns={columns}
        dataSource={filteredRows}
        loading={isLoading}
      />

      <Modal
        title="관리자 계정 등록"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={creating}
        destroyOnHidden
        okText="등록"
        cancelText="취소"
      >
        <Form<CreateAdminFormValues> form={createForm} layout="vertical">
          <Form.Item
            name="name"
            label="이름"
            rules={[{ required: true, message: "이름을 입력해 주세요." }]}
          >
            <Input placeholder="이름" />
          </Form.Item>
          <Form.Item
            name="email"
            label="이메일"
            rules={[{ required: true, type: "email", message: "이메일을 입력해 주세요." }]}
          >
            <Input placeholder="이메일" autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="role"
            label="역할"
            rules={[{ required: true, message: "역할을 선택해 주세요." }]}
          >
            <Select placeholder="역할 선택" options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default function Page() {
  return (
    <RequireRole roles={["SUPER_ADMIN"]}>
      <AdminAccountsPage />
    </RequireRole>
  );
}
