export type Role = "SYS_ADMIN" | "OPS_ADMIN" | "BIZ_ADMIN";

export const ROLE_LABEL: Record<Role, string> = {
  SYS_ADMIN: "총괄관리자",
  OPS_ADMIN: "운영관리자",
  BIZ_ADMIN: "업무관리자",
};

export interface AuthUser {
  id: number;
  name: string;
  role: Role;
}
