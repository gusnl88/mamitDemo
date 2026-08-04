"use client";

import { cloneElement, isValidElement, useMemo, useRef, useState } from "react";
import type { CSSProperties, Key, ReactNode } from "react";
import { Button, Card, Empty, Grid, Input, Pagination, Select, Space, Spin, Table } from "antd";
import type { TableProps } from "antd";
import type { SorterResult } from "antd/es/table/interface";
import { SearchOutlined, SortAscendingOutlined, SortDescendingOutlined } from "@ant-design/icons";
import { PageHeader } from "@/components/common/PageHeader";

const { useBreakpoint } = Grid;

export interface SortSpec {
  key: string;
  order: "ascend" | "descend";
}

/** 정렬 대상 식별용 키 — `key`가 없으면 `dataIndex`로 대체(ColumnGroupType엔 `dataIndex`가 없음). */
function columnSortKey(col: { key?: Key; dataIndex?: unknown }): string {
  if (col.key !== undefined) return String(col.key);
  return String("dataIndex" in col ? col.dataIndex : "");
}

/** 컬럼이 정렬 대상인지 — 클라이언트 모드는 비교 함수, 서버 모드는 `true`/`{multiple}` 형태를 씀. */
function isSortableColumn(col: { sorter?: unknown }): boolean {
  return (
    typeof col.sorter === "function" ||
    col.sorter === true ||
    (typeof col.sorter === "object" && col.sorter !== null)
  );
}

/** antd 컬럼의 `render`는 일반 노드 또는 병합 셀 `{ children, props }` 형태를 반환할 수 있음. */
function extractCellContent(rendered: unknown): ReactNode {
  if (rendered && typeof rendered === "object" && "children" in rendered) {
    return (rendered as { children: ReactNode }).children;
  }
  return rendered as ReactNode;
}

/**
 * 모바일에서는 주요 액션(예: "등록" 버튼)을 플로팅 액션 버튼으로 변환 —
 * 데스크톱의 늘어난 버튼 대신, 뷰포트 우측 하단에 고정된 원형 아이콘 버튼으로
 * (Gmail의 편지쓰기 버튼, Google Sheets의 "+" 같은 표준 모바일 패턴).
 */
function asFloatingActionButton(node: ReactNode): ReactNode {
  if (!isValidElement<{ icon?: ReactNode; style?: CSSProperties; shape?: string }>(node))
    return node;
  return cloneElement(
    node,
    {
      shape: "circle",
      style: {
        ...node.props.style,
        width: 40,
        height: 40,
        boxShadow: "0 6px 16px rgba(0, 0, 0, 0.25)",
      },
    },
    null,
  );
}

interface DataTableProps<T> extends Omit<TableProps<T>, "title"> {
  title: string;
  description?: string;
  /** 툴바에 추가되는 컨트롤, 예: "등록" 버튼 */
  actions?: ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** 행을 누르면 실행 (예: 상세 다이얼로그 열기). 데스크톱 테이블/모바일 카드 둘 다 적용됨. */
  onRowClick?: (record: T) => void;

  /**
   * 서버사이드 페이지네이션/정렬 모드 — 켜면 `dataSource`를 "이미 서버가 잘라서
   * 보내준 현재 페이지"로 간주해 내부에서 다시 자르거나 정렬하지 않음. 페이지/정렬이
   * 바뀌면 콜백만 호출하고, 실제 재조회(SWR 등)는 호출부에서 처리.
   */
  serverSide?: boolean;
  /** 서버가 알려주는 전체 개수(serverSide 전용). */
  total?: number;
  /** 현재 페이지, 1부터 시작(serverSide 전용). */
  page?: number;
  /** 페이지당 개수(serverSide 전용). */
  pageSize?: number;
  onPageChange?: (page: number, pageSize: number) => void;
  /** 정렬 상태가 바뀔 때(컬럼 헤더 클릭, 혹은 모바일 정렬 컨트롤) 호출(serverSide 전용). */
  onSortChange?: (sorts: SortSpec[]) => void;
}

/**
 * 흔한 CRUD 목록 패턴: 제목 + 검색/액션 툴바 + 페이지네이션 테이블.
 * `sm` 브레이크포인트 이하에서는 넓은 테이블 대신 행을 카드로 쌓아서 렌더링
 * (각 컬럼의 `render`를 그대로 재사용해서 두 뷰가 항상 동기화됨).
 */
export function DataTable<T extends object>({
  title,
  description,
  actions,
  searchPlaceholder = "검색",
  searchValue,
  onSearchChange,
  onRowClick,
  columns = [],
  dataSource = [],
  rowKey = "key",
  pagination,
  loading,
  serverSide = false,
  total,
  page: serverPage,
  pageSize: serverPageSize = 20,
  onPageChange,
  onSortChange,
  ...tableProps
}: DataTableProps<T>) {
  const screens = useBreakpoint();
  const isMobile = !screens.sm;
  const [clientPage, setClientPage] = useState(1);

  const getRowKey = (record: T, index: number): Key => {
    if (typeof rowKey === "function") return rowKey(record, index);
    return (record as Record<string, unknown>)[rowKey as string] as Key;
  };

  // `dataIndex`가 있는 컬럼은 일반 필드(모바일에서 label/value 행으로 표시)이고,
  // 없는 컬럼은 "actions" 컬럼으로 취급해서 카드 하단의 버튼 행으로 렌더링됨.
  const fieldColumns = columns.filter((col) => "dataIndex" in col && col.dataIndex !== undefined);
  const actionColumns = columns.filter(
    (col) => !("dataIndex" in col) || col.dataIndex === undefined,
  );

  // 컬럼에 `sorter`를 넣어두면 데스크톱에서는 antd Table 기본 기능으로 컬럼 헤더를
  // 각각 클릭해 정렬할 수 있음(컬럼마다 독립적, serverSide면 다중 정렬도 가능).
  // 모바일 카드뷰는 헤더 자체가 없어서 같은 방식이 불가능하므로, 모바일에서만
  // 툴바에 정렬 선택 컨트롤을 따로 둠.
  const sortableColumns = columns.filter(isSortableColumn);
  const [mobileSortKey, setMobileSortKey] = useState<string | null>(null);
  const [mobileSortOrder, setMobileSortOrder] = useState<"asc" | "desc">("asc");

  const mobileSortedDataSource = useMemo(() => {
    const original = dataSource as T[];
    if (serverSide) return original;
    const column = sortableColumns.find((col) => columnSortKey(col) === mobileSortKey);
    const compare = column && "sorter" in column ? column.sorter : undefined;
    if (typeof compare !== "function") return original;
    const sorted = [...original].sort(compare as (a: T, b: T) => number);
    return mobileSortOrder === "desc" ? sorted.reverse() : sorted;
  }, [dataSource, serverSide, mobileSortKey, mobileSortOrder, sortableColumns]);

  const handleMobileSortKeyChange = (value: string | null) => {
    setMobileSortKey(value);
    if (serverSide) {
      onSortChange?.(value ? [{ key: value, order: mobileSortOrder === "asc" ? "ascend" : "descend" }] : []);
    }
  };

  const handleMobileSortOrderToggle = () => {
    const nextOrder = mobileSortOrder === "asc" ? "desc" : "asc";
    setMobileSortOrder(nextOrder);
    if (serverSide && mobileSortKey) {
      onSortChange?.([{ key: mobileSortKey, order: nextOrder === "asc" ? "ascend" : "descend" }]);
    }
  };

  // antd Table의 onChange는 페이지네이션만 바뀌어도 매번 "현재" 정렬 상태를 함께
  // 넘겨준다 — onSortChange를 조건 없이 그대로 호출하면, 페이지 이동만 했는데도
  // 호출부의 정렬-변경 핸들러가 실행되어 페이지를 1로 되돌려버리는 문제가 생김.
  // 그래서 직전에 알린 정렬 상태와 실제로 달라졌을 때만 onSortChange를 호출한다.
  const lastEmittedSortRef = useRef<string>("[]");

  // antd Table의 헤더 클릭 정렬/페이지네이션 변경을 그대로 상위로 전달(serverSide 전용).
  const handleServerTableChange: NonNullable<TableProps<T>["onChange"]> = (
    paginationState,
    _filters,
    sorter,
  ) => {
    if (paginationState.current !== undefined && paginationState.pageSize !== undefined) {
      onPageChange?.(paginationState.current, paginationState.pageSize);
    }
    const sorterList = (Array.isArray(sorter) ? sorter : [sorter]) as SorterResult<T>[];
    const activeSorts: SortSpec[] = sorterList
      .filter((entry) => Boolean(entry.order))
      .map((entry) => ({
        key: String(entry.columnKey ?? entry.field ?? ""),
        order: entry.order as "ascend" | "descend",
      }));
    const serialized = JSON.stringify(activeSorts);
    if (serialized !== lastEmittedSortRef.current) {
      lastEmittedSortRef.current = serialized;
      onSortChange?.(activeSorts);
    }
  };

  // 아래 `rows`/`pagedRows`는 모바일 카드 목록 전용 — 데스크톱 <Table>은 자체
  // 페이지네이션/정렬을 쓰므로 원본 `columns`/`dataSource`를 그대로 전달함.
  const rows = isMobile ? mobileSortedDataSource : (dataSource as T[]);
  const clientPageSize =
    pagination === false ? rows.length || 1 : (pagination?.pageSize ?? 10);
  const pageCount = Math.max(1, Math.ceil(rows.length / clientPageSize));
  const currentClientPage = Math.min(clientPage, pageCount);
  const pagedRows = serverSide
    ? rows
    : pagination === false
      ? rows
      : rows.slice((currentClientPage - 1) * clientPageSize, currentClientPage * clientPageSize);

  const searchInput = onSearchChange && (
    <Input
      placeholder={searchPlaceholder}
      prefix={<SearchOutlined />}
      value={searchValue}
      onChange={(event) => onSearchChange(event.target.value)}
      allowClear
      style={isMobile ? { width: "100%", borderRadius: 999 } : undefined}
    />
  );

  // 데스크톱은 컬럼 헤더 클릭으로 정렬하므로, 이 툴바 컨트롤은 모바일에서만 노출.
  const sortControl = isMobile && sortableColumns.length > 0 && (
    <Space.Compact>
      <Select
        allowClear
        placeholder="정렬 기준"
        style={{ minWidth: 140 }}
        value={mobileSortKey ?? undefined}
        onChange={(value) => handleMobileSortKeyChange(value ?? null)}
        options={sortableColumns.map((col) => ({
          value: columnSortKey(col),
          label: col.title as ReactNode,
        }))}
      />
      {mobileSortKey && (
        <Button
          icon={mobileSortOrder === "asc" ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
          onClick={handleMobileSortOrderToggle}
        />
      )}
    </Space.Compact>
  );

  return (
    <Card>
      <PageHeader
        title={title}
        description={description}
        extra={
          isMobile ? (
            <Space orientation="vertical" style={{ width: "100%" }}>
              {searchInput}
              {sortControl}
            </Space>
          ) : (
            <Space wrap>
              {searchInput}
              {sortControl}
              {actions}
            </Space>
          )
        }
      />
      {isMobile ? (
        <Spin spinning={Boolean(loading)}>
          {rows.length === 0 ? (
            <Empty />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pagedRows.map((record, index) => (
                <Card
                  key={getRowKey(record, index)}
                  size="small"
                  hoverable={Boolean(onRowClick)}
                  onClick={onRowClick ? () => onRowClick(record) : undefined}
                  style={onRowClick ? { cursor: "pointer" } : undefined}
                >
                  {fieldColumns.map((col) => {
                    const dataIndex = "dataIndex" in col ? col.dataIndex : undefined;
                    const value = dataIndex
                      ? (record as Record<string, unknown>)[dataIndex as string]
                      : undefined;
                    const rendered = col.render
                      ? extractCellContent(col.render(value, record, index))
                      : (value as ReactNode);
                    return (
                      <div
                        key={col.key ?? (dataIndex as string)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          padding: "4px 0",
                        }}
                      >
                        <span style={{ color: "rgba(0, 0, 0, 0.45)", fontSize: 12, flexShrink: 0 }}>
                          {col.title as ReactNode}
                        </span>
                        <span style={{ textAlign: "right" }}>{rendered}</span>
                      </div>
                    );
                  })}
                  {actionColumns.length > 0 && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: "1px solid rgba(0, 0, 0, 0.06)",
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {actionColumns.map((col) => (
                        <span key={col.key}>
                          {extractCellContent(col.render?.(undefined, record, index))}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
          {serverSide
            ? total !== undefined &&
              total > serverPageSize && (
                <div style={{ marginTop: 16, textAlign: "center" }}>
                  <Pagination
                    size="small"
                    current={serverPage ?? 1}
                    pageSize={serverPageSize}
                    total={total}
                    onChange={(nextPage, nextPageSize) => onPageChange?.(nextPage, nextPageSize)}
                    showSizeChanger={false}
                  />
                </div>
              )
            : pagination !== false &&
              rows.length > clientPageSize && (
                <div style={{ marginTop: 16, textAlign: "center" }}>
                  <Pagination
                    size="small"
                    current={currentClientPage}
                    pageSize={clientPageSize}
                    total={rows.length}
                    onChange={setClientPage}
                    showSizeChanger={false}
                  />
                </div>
              )}
          {actions && <div style={{ height: 72 }} aria-hidden />}
        </Spin>
      ) : (
        <Table<T>
          rowKey={rowKey}
          pagination={
            serverSide
              ? {
                  current: serverPage ?? 1,
                  pageSize: serverPageSize,
                  total: total ?? 0,
                  showSizeChanger: false,
                }
              : (pagination ?? { pageSize: 10 })
          }
          onChange={serverSide ? handleServerTableChange : undefined}
          scroll={{ x: "max-content" }}
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          onRow={
            onRowClick
              ? (record) => ({ onClick: () => onRowClick(record), style: { cursor: "pointer" } })
              : undefined
          }
          {...tableProps}
        />
      )}
      {isMobile && actions && (
        <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 1000 }}>
          {asFloatingActionButton(actions)}
        </div>
      )}
    </Card>
  );
}
