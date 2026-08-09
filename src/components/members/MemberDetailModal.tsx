"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Avatar, Descriptions, Empty, Modal, Segmented, Spin } from "antd";
import { UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { MoimRoleTag } from "@/components/common/MoimRoleTag";

interface JoinedMoim {
  moimId: number;
  moimName: string;
  role: string;
  joinedAt: string;
  /** 탈퇴/강퇴된 모임 목록에서만 값이 있음. */
  leftAt: string | null;
}

interface MemberDetail {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
  realName: string | null;
  phoneNumber: string | null;
  createdAt: string;
  status: string;
  joinedMoims: JoinedMoim[];
  leftMoims: JoinedMoim[];
}

const formatDate = (value: string) => dayjs(value).format("YYYY-MM-DD");
const formatDateTime = (value: string | null) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-");

interface MemberDetailModalProps {
  /** null이면 닫힌 상태. 값이 바뀌면 SWR이 자동으로 해당 회원 상세를 불러온다. */
  memberId: number | null;
  onClose: () => void;
}

interface MoimListSectionProps {
  moims: JoinedMoim[];
  emptyDescription: string;
}

/** "가입된 모임"/"탈퇴된 모임" 토글 전환 시 선택된 쪽의 목록 렌더링. */
function MoimListSection({ moims, emptyDescription }: MoimListSectionProps) {
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
              <span>{moim.moimName}</span>
              <span>
                {moim.leftAt ? `${formatDate(moim.leftAt)} 탈퇴` : `${formatDate(moim.joinedAt)} 가입`}
              </span>
              <MoimRoleTag role={moim.role} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 회원 상세 다이얼로그 — 회원관리 화면뿐 아니라 모임 상세의 회원 목록 클릭에서도 재사용됨. */
export function MemberDetailModal({ memberId, onClose }: MemberDetailModalProps) {
  const { data: detail, isLoading, error } = useSWR<MemberDetail>(
    memberId !== null ? `/members/${memberId}` : null,
  );

  const [moimView, setMoimView] = useState<"joined" | "left">("joined");

  useEffect(() => {
    // 인터셉터가 이미 에러 메시지를 띄워줌 — 다이얼로그만 닫음.
    if (error) onClose();
  }, [error, onClose]);

  return (
    <Modal
      title="회원 상세"
      open={memberId !== null}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      style={{ top: 20 }}
      styles={{ body: { maxHeight: "calc(100vh - 160px)", overflowY: "auto" } }}
    >
      {isLoading || !detail ? (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Spin />
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <Avatar size={64} src={detail.profileImageUrl ?? undefined} icon={<UserOutlined />} />
          </div>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="닉네임">
              {detail.status !== "ACTIVE" ? (
                <>
                  {detail.nickname}
                  <span style={{ color: "rgba(0, 0, 0, 0.45)" }}> (탈퇴)</span>
                </>
              ) : (
                detail.nickname
              )}
            </Descriptions.Item>
            <Descriptions.Item label="본명">{detail.realName ?? "연동 예정"}</Descriptions.Item>
            <Descriptions.Item label="휴대폰번호">{detail.phoneNumber ?? "연동 예정"}</Descriptions.Item>
            <Descriptions.Item label="가입일시">{formatDateTime(detail.createdAt)}</Descriptions.Item>
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
            />
          </div>
        </>
      )}
    </Modal>
  );
}
