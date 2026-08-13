"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { Modal } from "antd";
import { MemberDetailContent } from "@/components/members/MemberDetailContent";
import type { MemberDetail } from "@/components/members/MemberDetailContent";

interface MemberDetailModalProps {
  /** null이면 닫힌 상태. 값이 바뀌면 SWR이 자동으로 해당 회원 상세를 불러온다. */
  memberId: number | null;
  onClose: () => void;
}

/** 회원 상세 다이얼로그 — 모임 상세의 회원 목록 클릭 등, 목록 페이지 이동 없이 미리보기가 필요한 곳에서 재사용됨. */
export function MemberDetailModal({ memberId, onClose }: MemberDetailModalProps) {
  const {
    data: detail,
    isLoading,
    error,
  } = useSWR<MemberDetail>(memberId !== null ? `/members/${memberId}` : null);

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
      <MemberDetailContent detail={detail} loading={isLoading} />
    </Modal>
  );
}
