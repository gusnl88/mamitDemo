import type { Role } from "@/types/auth";

/**
 * 큰 단위의 `Role` 게이트(`RequireRole`) 위에 얹는 세밀한 권한 체계.
 * 페이지 자체는 모든 역할의 조회를 허용하면서(`RequireRole`), 개별
 * 생성 컨트롤은 `hasPermission`으로 역할별로 숨기거나 비활성화할 수 있음.
 */
export const PERMISSION = {
  ADMIN_VIEW: "admin.view",
  ADMIN_CREATE: "admin.create",
} as const;

export type Permission = (typeof PERMISSION)[keyof typeof PERMISSION];

/**
 * 백엔드는 어드민 계정 관리 전체를 `ADMIN_MANAGE` 단일 권한으로 묶고
 * `SUPER_ADMIN`에게만 준다 — 역할변경/정지·활성화/비밀번호 재발급도 전부 이 하나로 묶여있다.
 */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  SUPER_ADMIN: new Set([PERMISSION.ADMIN_VIEW, PERMISSION.ADMIN_CREATE]),
  OPERATOR: new Set([PERMISSION.ADMIN_VIEW]),
  CONTENT: new Set([PERMISSION.ADMIN_VIEW]),
  VIEWER: new Set([PERMISSION.ADMIN_VIEW]),
};

export function hasPermission(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}
