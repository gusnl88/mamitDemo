"use client";

import { useState } from "react";
import useSWR from "swr";
import { App, Button, Form, Input, Modal, Popconfirm, Select, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { RequireRole } from "@/components/auth/RequireRole";
import { RoleTag } from "@/components/common/RoleTag";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { DataTable } from "@/components/table/DataTable";
import type { SortSpec } from "@/components/table/DataTable";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { ROLE_LABEL, type Role } from "@/types/auth";
import { ApiError } from "@/types/api";
import { PERMISSION, canEditAdminAccount, hasPermission } from "@/lib/auth/permissions";

interface AdminAccountRow {
  id: number;
  name: string;
  role: Role;
  email: string;
  phone: string | null;
}

interface AdminAccountPageResponse {
  content: AdminAccountRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const PAGE_SIZE = 10;

/** DataTable의 정렬 상태 → 백엔드 `sort` 쿼리 문자열("-role,name" 형식). */
const toSortParam = (sorts: SortSpec[]) =>
  sorts.map((sort) => (sort.order === "descend" ? `-${sort.key}` : sort.key)).join(",");

interface CreateAdminFormValues {
  name: string;
  role: Role;
  email: string;
  phone?: string;
}

interface EditAdminFormValues {
  name: string;
  role?: Role;
  email?: string;
  phone?: string;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = (
  ["SUPER_ADMIN", "OPERATOR", "CONTENT", "VIEWER"] as Role[]
).map((role) => ({ value: role, label: ROLE_LABEL[role] }));

// 010-0000-0000 / 010-000-0000 형식만 허용.
const PHONE_PATTERN = /^010-\d{3,4}-\d{4}$/;
const PHONE_RULES = [{ pattern: PHONE_PATTERN, message: "010-0000-0000 형식으로 입력해 주세요." }];
/** 숫자와 "-"만 남기고 나머지(한글 등)는 입력 즉시 걸러냄. */
const normalizePhone = (value: string) => value.replace(/[^0-9-]/g, "");

function AdminAccountsPage() {
  const { message } = App.useApp();
  const currentUser = useAuthStore((state) => state.user);

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [sorts, setSorts] = useState<SortSpec[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm<CreateAdminFormValues>();

  const [editingRow, setEditingRow] = useState<AdminAccountRow | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editForm] = Form.useForm<EditAdminFormValues>();

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
  if (keyword) query.set("keyword", keyword);
  const sortParam = toSortParam(sorts);
  if (sortParam) query.set("sort", sortParam);

  const { data, error, isLoading, mutate } = useSWR<AdminAccountPageResponse>(
    `/users?${query.toString()}`,
  );

  const handleSearchChange = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  const handleSortChange = (nextSorts: SortSpec[]) => {
    setSorts(nextSorts);
    setPage(1);
  };

  const canCreate = hasPermission(currentUser?.role, PERMISSION.ADMIN_CREATE);
  const canUpdateAny = hasPermission(currentUser?.role, PERMISSION.ADMIN_UPDATE);
  const canDelete = hasPermission(currentUser?.role, PERMISSION.ADMIN_DELETE);

  // 이 화면에 도달할 수 있는 건 어차피 ADMIN_MANAGE(=SUPER_ADMIN)뿐이라 역할 제한이 없다.
  const createRoleOptions = ROLE_OPTIONS;

  const openCreateModal = () => {
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      await apiClient.post("/users", values);
      message.success("관리자 계정이 등록되었습니다.");
      await mutate();
      setCreateOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        // 응답 인터셉터가 이미 message.error로 표시했음.
        return;
      }
      // 폼 검증 에러도 여기로 떨어지는데, antd가 이미 문제 필드를
      // 강조해주므로 더 할 일 없음.
    } finally {
      setCreating(false);
    }
  };

  // antd Form의 `initialValues`는 최초 마운트 시 한 번만 반영되고 이후 값이 바뀌어도
  // 다시 채워지지 않음 — 그래서 모달을 열 때마다 항상 setFieldsValue로 직접 채워준다.
  const openEditModal = (row: AdminAccountRow) => {
    setEditingRow(row);
    editForm.setFieldsValue({
      name: row.name,
      role: row.role,
      email: row.email,
      phone: row.phone ?? undefined,
    });
  };

  // 자기 계정만 수정 가능한 경우(ADMIN_MANAGE 없음)에는 아예 숨김 —
  // 서버가 이때 role 값을 조용히 무시하므로, 아무 동작도 안 하는
  // 컨트롤을 보여주면 혼란만 줌.
  const editingShowsRoleField = editingRow ? canUpdateAny : false;
  const editRoleOptions = ROLE_OPTIONS;

  const handleUpdate = async () => {
    if (!editingRow) return;
    try {
      const values = await editForm.validateFields();
      setUpdating(true);
      const payload: EditAdminFormValues = { name: values.name, phone: values.phone };
      if (values.email) {
        payload.email = values.email;
      }
      if (editingShowsRoleField && values.role) {
        payload.role = values.role;
      }
      await apiClient.put(`/users/${editingRow.id}`, payload);
      message.success("관리자 계정이 수정되었습니다.");
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

  const handleDelete = async (row: AdminAccountRow) => {
    try {
      setDeletingId(row.id);
      await apiClient.delete(`/users/${row.id}`);
      message.success("관리자 계정이 삭제되었습니다.");
      await mutate();
    } catch (err) {
      if (err instanceof ApiError) {
        return;
      }
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    { title: "이름", dataIndex: "name", key: "name", sorter: { multiple: 1 } },
    { title: "이메일", dataIndex: "email", key: "email", sorter: { multiple: 2 } },
    {
      title: "휴대폰번호",
      dataIndex: "phone",
      key: "phone",
      render: (phone: string | null) => phone ?? "",
      sorter: { multiple: 3 },
    },
    {
      title: "역할",
      dataIndex: "role",
      key: "role",
      render: (role: Role) => <RoleTag role={role} />,
      sorter: { multiple: 4 },
    },
    {
      title: "관리",
      key: "actions",
      render: (_: unknown, row: AdminAccountRow) => {
        const showEdit = currentUser ? canEditAdminAccount(currentUser, row) : false;
        const showDelete = canDelete && row.email !== currentUser?.email;

        if (!showEdit && !showDelete) return null;

        return (
          <Space>
            {showEdit && (
              <Button size="small" onClick={() => openEditModal(row)}>
                수정
              </Button>
            )}
            {showDelete && (
              <Popconfirm
                title="정말 삭제하시겠습니까?"
                onConfirm={() => handleDelete(row)}
                okText="삭제"
                cancelText="취소"
              >
                <Button size="small" danger loading={deletingId === row.id}>
                  삭제
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      {error && (
        <ErrorAlert message="관리자 목록을 불러오지 못했습니다." onRetry={() => mutate()} />
      )}
      <DataTable<AdminAccountRow>
        title="관리자 계정 관리"
        searchPlaceholder="이름/이메일 검색"
        searchValue={keyword}
        onSearchChange={handleSearchChange}
        actions={
          canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              등록
            </Button>
          )
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
          <Form.Item name="phone" label="휴대폰번호" rules={PHONE_RULES} normalize={normalizePhone}>
            <Input placeholder="010-0000-0000" autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="role"
            label="역할"
            rules={[{ required: true, message: "역할을 선택해 주세요." }]}
          >
            <Select placeholder="역할 선택" options={createRoleOptions} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="관리자 계정 수정"
        open={editingRow !== null}
        onOk={handleUpdate}
        onCancel={() => setEditingRow(null)}
        confirmLoading={updating}
        destroyOnHidden
        okText="저장"
        cancelText="취소"
      >
        <Form<EditAdminFormValues> form={editForm} layout="vertical">
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
            rules={[{ type: "email", message: "올바른 이메일 형식이 아닙니다." }]}
          >
            <Input placeholder="이메일" autoComplete="off" />
          </Form.Item>
          <Form.Item name="phone" label="휴대폰번호" rules={PHONE_RULES} normalize={normalizePhone}>
            <Input placeholder="010-0000-0000" autoComplete="off" />
          </Form.Item>
          {editingShowsRoleField && (
            <Form.Item
              name="role"
              label="역할"
              rules={[{ required: true, message: "역할을 선택해 주세요." }]}
            >
              <Select placeholder="역할 선택" options={editRoleOptions} />
            </Form.Item>
          )}
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
