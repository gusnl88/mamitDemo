"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import dayjs from "dayjs";
import { Tag } from "antd";
import { DataTable } from "@/components/table/DataTable";
import type { SortSpec } from "@/components/table/DataTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";

interface MemberListItem {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
  lastLoginAt: string | null;
  status: string;
}

interface MemberPageResponse {
  content: MemberListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const PAGE_SIZE = 10;

const formatDateTime = (value: string | null) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-";

/** DataTable의 정렬 상태 → 백엔드 `sort` 쿼리 문자열("-nickname,lastLoginAt" 형식). */
const toSortParam = (sorts: SortSpec[]) =>
  sorts.map((sort) => (sort.order === "descend" ? `-${sort.key}` : sort.key)).join(",");

export default function MembersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [sorts, setSorts] = useState<SortSpec[]>([]);

  const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
  if (keyword) query.set("keyword", keyword);
  const sortParam = toSortParam(sorts);
  if (sortParam) query.set("sort", sortParam);

  const { data, error, isLoading, mutate } = useSWR<MemberPageResponse>(
    `/members?${query.toString()}`,
  );

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
      title: "닉네임",
      dataIndex: "nickname",
      key: "nickname",
      render: (nickname: string, record: MemberListItem) => (
        <>
          {nickname}
          {record.status !== "ACTIVE" && <Tag style={{ marginLeft: 8, color: "red" }}>탈퇴</Tag>}
        </>
      ),
      sorter: { multiple: 1 },
    },
    {
      title: "최근 접속일시",
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      render: formatDateTime,
      sorter: { multiple: 2 },
    },
  ];

  return (
    <>
      {error && <ErrorAlert message="회원 목록을 불러오지 못했습니다." onRetry={() => mutate()} />}
      <DataTable<MemberListItem>
        title="회원관리"
        searchPlaceholder="닉네임 또는 휴대폰번호 검색"
        searchValue={keyword}
        onSearchChange={handleSearchChange}
        rowKey="id"
        columns={columns}
        dataSource={data?.content ?? []}
        loading={isLoading}
        onRowClick={(record) => router.push(`/members/${record.id}`)}
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
