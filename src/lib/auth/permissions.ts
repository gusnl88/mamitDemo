import type { Role } from "@/types/auth";

/**
 * 큰 단위의 `Role` 게이트(`RequireRole`) 위에 얹는 세밀한 권한 체계.
 * 페이지 자체는 모든 역할의 조회를 허용하면서(`RequireRole`), 개별
 * 생성/수정/삭제 컨트롤은 `hasPermission` / `canEditAdminAccount`로
 * 역할별로 숨기거나 비활성화할 수 있음.
 */
export const PERMISSION = {
  ADMIN_VIEW: "admin.view",
  ADMIN_CREATE: "admin.create",
  ADMIN_UPDATE: "admin.update", // 모든 관리자 계정 수정
  ADMIN_UPDATE_OWN: "admin.update_own", // 본인 계정만 수정
  ADMIN_DELETE: "admin.delete",
} as const;

export type Permission = (typeof PERMISSION)[keyof typeof PERMISSION];

/**
 * 백엔드는 어드민 계정 관리 전체를 `ADMIN_MANAGE` 단일 권한으로 묶고
 * `SUPER_ADMIN`에게만 준다 — "본인 계정만 수정" 같은 별도 권한은
 * 서버에 없다. `ADMIN_UPDATE_OWN`은 아무 역할에도 배정하지 않는다.
 */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  SUPER_ADMIN: new Set([
    PERMISSION.ADMIN_VIEW,
    PERMISSION.ADMIN_CREATE,
    PERMISSION.ADMIN_UPDATE,
    PERMISSION.ADMIN_DELETE,
  ]),
  OPERATOR: new Set([PERMISSION.ADMIN_VIEW]),
  CONTENT: new Set([PERMISSION.ADMIN_VIEW]),
  VIEWER: new Set([PERMISSION.ADMIN_VIEW]),
};

export function hasPermission(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/** 백엔드가 강제하는 규칙과 동일하게, `current`가 `target`의 관리자 계정을 수정할 수 있는지 여부. */
export function canEditAdminAccount(
  current: { email: string; role: Role },
  target: { email: string },
): boolean {
  if (hasPermission(current.role, PERMISSION.ADMIN_UPDATE)) return true;
  if (hasPermission(current.role, PERMISSION.ADMIN_UPDATE_OWN)) return current.email === target.email;
  return false;
}
