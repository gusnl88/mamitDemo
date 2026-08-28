export type Role = "SUPER_ADMIN" | "OPERATOR" | "CONTENT" | "VIEWER";

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "최고관리자",
  OPERATOR: "운영자",
  CONTENT: "콘텐츠관리자",
  VIEWER: "조회전용",
};

export interface AuthUser {
  email: string;
  name: string;
  role: Role;
  permissions: string[];
  mustChangePassword: boolean;
}
