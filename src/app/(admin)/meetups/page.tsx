"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import dayjs from "dayjs";
import { Tag } from "antd";
import { DataTable } from "@/components/table/DataTable";
import type { SortSpec } from "@/components/table/DataTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";

interface MoimListItem {
  id: number;
  name: string;
  status?: string;
  categoryName: string;
  regionName: string | null;
  memberCount: number;
  createdAt: string;
}

interface MoimPageResponse {
  content: MoimListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const PAGE_SIZE = 10;

/** DataTable의 정렬 상태 → 백엔드 `sort` 쿼리 문자열("-memberCount,name" 형식). */
const toSortParam = (sorts: SortSpec[]) =>
  sorts.map((sort) => (sort.order === "descend" ? `-${sort.key}` : sort.key)).join(",");

const formatDateTime = (value: string | null) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-";

export default function MeetupsPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [sorts, setSorts] = useState<SortSpec[]>([]);

  const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
  if (keyword) query.set("keyword", keyword);
  const sortParam = toSortParam(sorts);
  if (sortParam) query.set("sort", sortParam);

  const { data, error, isLoading, mutate } = useSWR<MoimPageResponse>(`/moims?${query.toString()}`);

  const handleSearchChange = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  const handleSortChange = (nextSorts: SortSpec[]) => {
    setSorts(nextSorts);
    setPage(1);
  };

  const columns = [
    {
      title: "모임명",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: MoimListItem) => (
        <>
          <Link href={`/meetups/${record.id}`} className="clickable">
            {name}
          </Link>
          {record.status === "DELETED" && (
            <Tag style={{ marginLeft: 8, color: "red" }}>삭제된 모임</Tag>
          )}
        </>
      ),
      sorter: { multiple: 1 },
    },
    { title: "카테고리", dataIndex: "categoryName", key: "categoryName", sorter: { multiple: 2 } },
    {
      title: "지역",
      dataIndex: "regionName",
      key: "regionName",
      render: (value: string | null) => value ?? "-",
      sorter: { multiple: 5 },
    },
    { title: "멤버 수", dataIndex: "memberCount", key: "memberCount", sorter: { multiple: 3 } },
    {
      title: "생성일",
      dataIndex: "createdAt",
      key: "createdAt",
      render: formatDateTime,
      sorter: { multiple: 4 },
    },
  ];

  return (
    <>
      {error && <ErrorAlert message="모임 목록을 불러오지 못했습니다." onRetry={() => mutate()} />}
      <DataTable<MoimListItem>
        title="모임관리"
        searchPlaceholder="모임명 검색"
        searchValue={keyword}
        onSearchChange={handleSearchChange}
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
    </>
  );
}
