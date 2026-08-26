import Link from "next/link";
import dayjs from "dayjs";
import { Descriptions, Empty, Spin, Tag } from "antd";
import { MoimRoleTag } from "@/components/common/MoimRoleTag";

export interface MoimMemberItem {
  userId: number;
  nickname: string;
  role: string;
  joinedAt: string;
}

export interface MoimDetail {
  id: number;
  name: string;
  description: string | null;
  categoryName: string;
  regionName: string | null;
  maxMembers: number;
  currentMembers: number;
  status: string;
  createdAt: string;
  members: MoimMemberItem[];
}

const STATUS_LABEL: Record<string, string> = {
  RECRUITING: "모집중",
  ONGOING: "진행중",
  CLOSED: "마감",
  COMPLETED: "완료",
  DELETED: "삭제됨",
};

const formatDateTime = (value: string | null) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-";

interface MoimDetailContentProps {
  detail: MoimDetail | undefined;
  loading: boolean;
}

/** 모임 상세 본문 — 모임 상세 페이지에서 사용. */
export function MoimDetailContent({ detail, loading }: MoimDetailContentProps) {
  if (loading || !detail) {
    return (
      <div style={{ textAlign: "center", padding: 24 }}>
        <Spin />
      </div>
    );
  }

  return (
    <>
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="모임명">{detail.name}</Descriptions.Item>
        <Descriptions.Item label="카테고리">{detail.categoryName}</Descriptions.Item>
        <Descriptions.Item label="지역">{detail.regionName ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="설명">{detail.description ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="인원">{detail.currentMembers}</Descriptions.Item>
        <Descriptions.Item label="상태">
          <Tag>{STATUS_LABEL[detail.status] ?? detail.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="생성일">{formatDateTime(detail.createdAt)}</Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>회원 목록</div>
        {detail.members.length === 0 ? (
          <Empty description="가입된 회원이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: "min(240px, 35vh)",
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {detail.members.map((member) => (
              <div
                key={member.userId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 10px",
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                  borderRadius: 6,
                }}
              >
                <Link href={`/members/${member.userId}`} className="clickable">
                  {member.nickname}
                </Link>
                <MoimRoleTag role={member.role} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
