"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { App, Button, Form, Segmented } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { DataTable } from "@/components/table/DataTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { BannerFormModal, type BannerFormValues } from "@/components/banners/BannerFormModal";
import {
  CATEGORY_OPTIONS,
  nextDisplayOrder,
  orderedInCategory,
  toDisplayPeriod,
  toPeriodValue,
  type BannerCategory,
  type BannerRow,
} from "@/components/banners/banner";
import { useBannerColumns } from "@/components/banners/useBannerColumns";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { ApiError } from "@/types/api";

const BANNERS_URL = "/banners";

export default function BannersPage() {
  const { message } = App.useApp();
  // 운영자·조회전용은 BANNER_READ 만 있다 — 쓰기 컨트롤을 보여주면 눌러도 403 이 난다.
  const canWrite = useAuthStore((state) => state.user?.permissions?.includes("BANNER_WRITE") ?? false);

  // AdminBannerController.list 는 페이지네이션·검색이 없다 (카테고리 → 노출순서로 정렬된 전체).
  // 다음 노출순서를 계산하려면 카테고리 전체가 필요해서, 카테고리 필터도 클라이언트에서 건다.
  const { data, error, isLoading, mutate } = useSWR<BannerRow[]>(BANNERS_URL);
  const allRows = useMemo(() => data ?? [], [data]);
  const [keyword, setKeyword] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<BannerCategory | "ALL">("ALL");

  const filteredRows = useMemo(() => {
    const lower = keyword.trim().toLowerCase();
    return allRows.filter(
      (row) =>
        (categoryFilter === "ALL" || row.category === categoryFilter) &&
        (!lower || row.title.toLowerCase().includes(lower)),
    );
  }, [allRows, keyword, categoryFilter]);

  // ---------- 등록 ----------
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm<BannerFormValues>();

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);

      // 이미지가 있어야 배너를 만들 수 있어서 /with-image 로 한 번에 보낸다.
      // 이 API 는 노출기간을 받지 않으므로, 기간을 정했으면 만든 직후 따로 저장한다.
      const formData = new FormData();
      formData.append("category", values.category);
      formData.append("title", values.title);
      if (values.description) formData.append("description", values.description);
      if (values.targetUrl) formData.append("targetUrl", values.targetUrl);
      formData.append("displayOrder", String(values.displayOrder));
      formData.append("image", values.image.file!);
      const { data: created } = await apiClient.post<BannerRow>(
        `${BANNERS_URL}/with-image`,
        formData,
      );

      const period = toDisplayPeriod(values.period);
      if (period.displayStartAt || period.displayEndAt) {
        await apiClient.put(`${BANNERS_URL}/${created.id}/display-period`, period);
      }

      message.success("배너가 등록되었습니다.");
      setCreateOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        // 응답 인터셉터가 이미 message.error로 표시함
        return;
      }
      // 폼 검증 에러도 여기로 떨어지는데, antd가 이미 문제 필드를 강조해주므로 더 할 일 없음.
    } finally {
      setCreating(false);
      // 기간 저장만 실패한 경우에도 배너는 만들어졌으니 목록은 항상 다시 읽는다.
      await mutate();
    }
  };

  // ---------- 수정 ----------
  const [editingRow, setEditingRow] = useState<BannerRow | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editForm] = Form.useForm<BannerFormValues>();

  // 모달이 닫혀 있으면 Form 이 언마운트돼 있어서(destroyOnHidden) setFieldsValue 가 먹지 않는다 —
  // 대신 열릴 때 새로 만들어지는 Form 의 initialValues 로 넘긴다.
  const editInitialValues = useMemo<Partial<BannerFormValues> | undefined>(
    () =>
      editingRow
        ? {
            category: editingRow.category,
            title: editingRow.title,
            description: editingRow.description ?? undefined,
            targetUrl: editingRow.targetUrl ?? undefined,
            image: { previewUrl: editingRow.imageUrl },
            period: toPeriodValue(editingRow),
          }
        : undefined,
    [editingRow],
  );

  const handleUpdate = async () => {
    if (!editingRow) return;
    try {
      const values = await editForm.validateFields();
      setUpdating(true);
      const url = `${BANNERS_URL}/${editingRow.id}`;

      if (values.image.file) {
        const formData = new FormData();
        formData.append("title", values.title);
        if (values.description) formData.append("description", values.description);
        if (values.targetUrl) formData.append("targetUrl", values.targetUrl);
        formData.append("image", values.image.file);
        await apiClient.put(`${url}/with-image`, formData);
      } else {
        await apiClient.put(url, {
          title: values.title,
          description: values.description || null,
          imageUrl: editingRow.imageUrl,
          targetUrl: values.targetUrl || null,
        });
      }

      // 노출기간은 별도 API — 건드린 경우에만 보낸다(시각까지 저장된 기존 값을 날짜 단위로 덮지 않게).
      if (editForm.isFieldTouched("period")) {
        await apiClient.put(`${url}/display-period`, toDisplayPeriod(values.period));
      }

      message.success("배너가 수정되었습니다.");
      await mutate();
      setEditingRow(null);
    } catch (err) {
      if (err instanceof ApiError) {
        await mutate();
        return;
      }
    } finally {
      setUpdating(false);
    }
  };

  // ---------- 삭제/노출 토글/순서 변경 ----------
  const handleDelete = async (row: BannerRow) => {
    try {
      await apiClient.delete(`${BANNERS_URL}/${row.id}`);
      message.success("배너가 삭제되었습니다.");
      await mutate();
    } catch (err) {
      if (err instanceof ApiError) return;
    }
  };

  const handleToggleActive = async (row: BannerRow, active: boolean) => {
    try {
      if (active) {
        // 비활성 배너는 순서가 비어 있다 — 다시 켤 때는 그 카테고리의 맨 뒤로 붙인다.
        await apiClient.put(`${BANNERS_URL}/${row.id}/activate`, {
          displayOrder: nextDisplayOrder(allRows, row.category),
        });
      } else {
        await apiClient.put(`${BANNERS_URL}/${row.id}/deactivate`);
      }
      message.success(active ? "배너를 노출 처리했습니다." : "배너를 비노출 처리했습니다.");
      await mutate();
    } catch (err) {
      if (err instanceof ApiError) return;
    }
  };

  const [moving, setMoving] = useState(false);

  const handleMove = async (row: BannerRow, direction: "up" | "down") => {
    const ordered = orderedInCategory(allRows, row.category);
    const index = ordered.findIndex((item) => item.id === row.id);
    const neighbor = ordered[direction === "up" ? index - 1 : index + 1];
    if (!neighbor) return;

    // (카테고리, 노출순서)에 유니크 제약이 있어 바로 맞바꿀 수 없다 — 빈 순서를 거쳐서 교환한다.
    setMoving(true);
    try {
      const temp = nextDisplayOrder(allRows, row.category);
      await apiClient.put(`${BANNERS_URL}/${row.id}/display-order`, { displayOrder: temp });
      await apiClient.put(`${BANNERS_URL}/${neighbor.id}/display-order`, {
        displayOrder: row.displayOrder,
      });
      await apiClient.put(`${BANNERS_URL}/${row.id}/display-order`, {
        displayOrder: neighbor.displayOrder,
      });
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    } finally {
      // 중간에 실패해도 서버 상태를 그대로 보여준다.
      await mutate();
      setMoving(false);
    }
  };

  const columns = useBannerColumns({
    allRows,
    canWrite,
    moving,
    onMove: handleMove,
    onToggleActive: handleToggleActive,
    onEdit: setEditingRow,
    onDelete: handleDelete,
  });

  return (
    <>
      {error && <ErrorAlert message="배너 목록을 불러오지 못했습니다." onRetry={() => mutate()} />}
      {/* actions 는 모바일에서 플로팅 버튼 하나로 바뀌므로 카테고리 필터는 표 위에 따로 둔다. */}
      <Segmented<BannerCategory | "ALL">
        value={categoryFilter}
        onChange={setCategoryFilter}
        options={[{ value: "ALL", label: "전체" }, ...CATEGORY_OPTIONS]}
        style={{ marginBottom: 12 }}
      />
      <DataTable<BannerRow>
        title="배너관리"
        searchPlaceholder="타이틀 검색"
        searchValue={keyword}
        onSearchChange={setKeyword}
        actions={
          canWrite ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              등록
            </Button>
          ) : undefined
        }
        rowKey="id"
        columns={columns}
        dataSource={filteredRows}
        loading={isLoading}
      />

      <BannerFormModal
        mode="create"
        open={createOpen}
        form={createForm}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={creating}
        onValuesChange={(changed) => {
          if (changed.category) {
            createForm.setFieldsValue({ displayOrder: nextDisplayOrder(allRows, changed.category) });
          }
        }}
      />

      <BannerFormModal
        mode="edit"
        open={editingRow !== null}
        form={editForm}
        initialValues={editInitialValues}
        onOk={handleUpdate}
        onCancel={() => setEditingRow(null)}
        confirmLoading={updating}
      />
    </>
  );
}
