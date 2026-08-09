import { Tag } from "antd";

export interface MoimRoleTagProps {
  /** 모임 멤버 role — "OWNER" | "MEMBER" (백엔드 문자열 그대로 전달). */
  role: string;
}

/** 모임 멤버 목록에서 모임장/멤버를 표시하는 배지 — 회원 상세, 모임 상세에서 공통으로 재사용. */
export function MoimRoleTag({ role }: MoimRoleTagProps) {
  const isOwner = role === "OWNER";
  return <Tag color={isOwner ? "gold" : "default"}>{isOwner ? "모임장" : "멤버"}</Tag>;
}
