import { Tag } from "antd";
import { ROLE_LABEL, type Role } from "@/types/auth";

export interface RoleTagProps {
  role: Role;
}

const ROLE_COLOR: Record<Role, string> = {
  SYS_ADMIN: "gold",
  OPS_ADMIN: "blue",
  BIZ_ADMIN: "default",
};

/** 일관된 색상의 역할 배지, 사용자 `Role`을 표시하는 곳이면 어디서든 재사용. */
export function RoleTag({ role }: RoleTagProps) {
  return <Tag color={ROLE_COLOR[role]}>{ROLE_LABEL[role]}</Tag>;
}
