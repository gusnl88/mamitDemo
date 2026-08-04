"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { Avatar, Descriptions, Empty, Modal, Spin, Tag } from "antd";
import { UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

interface JoinedMoim {
  moimId: number;
  moimName: string;
  role: string;
  joinedAt: string;
}

interface MemberDetail {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
  realName: string | null;
  phoneNumber: string | null;
  createdAt: string;
  joinedMoims: JoinedMoim[];
}

const formatDateTime = (value: string | null) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-");

interface MemberDetailModalProps {
  /** null이면 닫힌 상태. 값이 바뀌면 SWR이 자동으로 해당 회원 상세를 불러온다. */
  memberId: number | null;
  onClose: () => void;
}

/** 회원 상세 다이얼로그 — 회원관리 화면뿐 아니라 모임 상세의 회원 목록 클릭에서도 재사용됨. */
export function MemberDetailModal({ memberId, onClose }: MemberDetailModalProps) {
  const { data: detail, isLoading, error } = useSWR<MemberDetail>(
    memberId !== null ? `/members/${memberId}` : null,
  );

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
            <Descriptions.Item label="닉네임">{detail.nickname}</Descriptions.Item>
            <Descriptions.Item label="본명">{detail.realName ?? "연동 예정"}</Descriptions.Item>
            <Descriptions.Item label="휴대폰번호">{detail.phoneNumber ?? "연동 예정"}</Descriptions.Item>
            <Descriptions.Item label="가입일시">{formatDateTime(detail.createdAt)}</Descriptions.Item>
          </Descriptions>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>가입된 모임</div>
            {detail.joinedMoims.length === 0 ? (
              <Empty description="가입된 모임이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                {detail.joinedMoims.map((moim) => (
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
                    <Tag color={moim.role === "OWNER" ? "gold" : "default"}>
                      {moim.role === "OWNER" ? "모임장" : "멤버"}
                    </Tag>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
