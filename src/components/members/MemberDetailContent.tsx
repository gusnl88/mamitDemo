import { Avatar, Descriptions, Empty, Segmented, Spin, Tag } from "antd";
import { useState } from "react";
import { UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { MoimRoleTag } from "@/components/common/MoimRoleTag";

const formatDateTime = (value: string | null) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-");

export interface JoinedMoim {
  moimId: number;
  moimName: string;
  role: string;
  joinedAt: string;
  /** 탈퇴/강퇴된 모임 목록에서만 값이 있음. */
  leftAt: string | null;
}

export interface MemberDetail {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
  realName: string | null;
  phoneNumber: string | null;
  createdAt: string;
  /** 탈퇴 전이면 null. */
  withdrawnAt: string | null;
  status: string;
  joinedMoims: JoinedMoim[];
  leftMoims: JoinedMoim[];
}

interface MoimListSectionProps {
  moims: JoinedMoim[];
  emptyDescription: string;
  /** "left"면 가입일시 아래에 탈퇴일시도 함께 표시. */
  variant: "joined" | "left";
}

/** "가입된 모임"/"탈퇴된 모임" 토글 전환 시 선택된 쪽의 목록 렌더링. */
function MoimListSection({ moims, emptyDescription, variant }: MoimListSectionProps) {
  return (
    <div style={{ marginTop: 12 }}>
      {moims.length === 0 ? (
        <Empty description={emptyDescription} image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
          {moims.map((moim) => (
            <div
              key={moim.moimId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 10px",
                border: "1px solid rgba(0, 0, 0, 0.06)",
                borderRadius: 6,
              }}
            >
              <div>
                <div>{moim.moimName}</div>
                <div style={{ color: "rgba(0, 0, 0, 0.45)", fontSize: 12 }}>
                  가입일시 {formatDateTime(moim.joinedAt)}
                </div>
                {variant === "left" && (
                  <div style={{ color: "rgba(0, 0, 0, 0.45)", fontSize: 12 }}>
                    탈퇴일시 {formatDateTime(moim.leftAt)}
                  </div>
                )}
              </div>
              <MoimRoleTag role={moim.role} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface MemberDetailContentProps {
  detail: MemberDetail | undefined;
  loading: boolean;
}

/** 회원 상세 본문 — 모달(회원 상세 다이얼로그)과 회원 상세 페이지에서 공통으로 재사용. */
export function MemberDetailContent({ detail, loading }: MemberDetailContentProps) {
  const [moimView, setMoimView] = useState<"joined" | "left">("joined");

  if (loading || !detail) {
    return (
      <div style={{ textAlign: "center", padding: 24 }}>
        <Spin />
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <Avatar size={64} src={detail.profileImageUrl ?? undefined} icon={<UserOutlined />} />
      </div>
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="닉네임">
          {detail.nickname}
          {detail.status !== "ACTIVE" && <Tag style={{ marginLeft: 8, color: "red" }}>탈퇴</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="본명">{detail.realName ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="휴대폰번호">{detail.phoneNumber ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="가입일시">{formatDateTime(detail.createdAt)}</Descriptions.Item>
        <Descriptions.Item label="탈퇴일시">{formatDateTime(detail.withdrawnAt)}</Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 16 }}>
        <Segmented
          block
          value={moimView}
          onChange={(value) => setMoimView(value as "joined" | "left")}
          options={[
            { label: `가입된 모임 (${detail.joinedMoims.length})`, value: "joined" },
            { label: `탈퇴된 모임 (${detail.leftMoims.length})`, value: "left" },
          ]}
        />
        <MoimListSection
          moims={moimView === "joined" ? detail.joinedMoims : detail.leftMoims}
          emptyDescription={
            moimView === "joined" ? "가입된 모임이 없습니다." : "탈퇴된 모임이 없습니다."
          }
          variant={moimView}
        />
      </div>
    </>
  );
}
