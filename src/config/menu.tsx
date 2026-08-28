import {
  DashboardOutlined,
  TeamOutlined,
  SettingOutlined,
  UserOutlined,
  UsergroupAddOutlined,
  FlagOutlined,
  QuestionCircleOutlined,
  PictureOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";
import type { Role } from "@/types/auth";

export interface MenuEntry {
  key: string;
  label: string;
  icon: ReactNode;
  path: string;
  /** 생략하면 인증된 모든 역할 허용 */
  roles?: Role[];
}

export const MENU_ITEMS: MenuEntry[] = [
  { key: "dashboard", label: "대시보드", icon: <DashboardOutlined />, path: "/dashboard" },
  { key: "members", label: "회원관리", icon: <UserOutlined />, path: "/members" },
  { key: "meetups", label: "모임관리", icon: <UsergroupAddOutlined />, path: "/meetups" },
  { key: "reports", label: "신고관리", icon: <FlagOutlined />, path: "/reports" },
  { key: "banners", label: "배너관리", icon: <PictureOutlined />, path: "/banners" },
  { key: "faq", label: "고객센터(FAQ)", icon: <QuestionCircleOutlined />, path: "/faq" },
  { key: "terms", label: "약관관리", icon: <FileTextOutlined />, path: "/terms" },
  {
    key: "admins",
    label: "관리자 계정",
    icon: <TeamOutlined />,
    path: "/system/admins",
    // 어드민 계정 관리는 서버에서 ADMIN_MANAGE 권한 하나로 묶여 있고, 기본 역할 중엔
    // SUPER_ADMIN만 갖는다.
    roles: ["SUPER_ADMIN"],
  },
  { key: "settings", label: "설정", icon: <SettingOutlined />, path: "/settings" },
];
