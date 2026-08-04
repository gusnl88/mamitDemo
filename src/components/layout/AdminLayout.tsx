"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, Button, Drawer, Dropdown, Grid, Layout, Menu, Space, Typography } from "antd";
import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { MENU_ITEMS } from "@/config/menu";
import { useAuthStore } from "@/store/useAuthStore";
import { RoleTag } from "@/components/common/RoleTag";
import { BRAND_COLOR } from "@/config/theme";

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

function BrandMark({ showLabel }: { showLabel: boolean }) {
  return (
    <div
      style={{
        minHeight: 72,
        padding: "12px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
        <Image src="/brand/logo-mark.png" alt="" width={36} height={36} />
      </div>
      {showLabel && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
          <span style={{ color: BRAND_COLOR, fontWeight: 800, fontSize: 19, letterSpacing: 0.3 }}>
            Mamit Admin
          </span>
          <span style={{ color: "rgba(0, 0, 0, 0.45)", fontSize: 9 }}>
            Tips · Chats · Meetups for Moms
          </span>
        </div>
      )}
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const visibleItems = useMemo(
    () => MENU_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role))),
    [user],
  );

  const selectedKey = visibleItems.find((item) => pathname.startsWith(item.path))?.key;

  const handleLogout = () => {
    clearAuth();
    router.replace("/login");
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    setMobileOpen(false);
  };

  const menu = (
    <Menu
      theme="light"
      mode="inline"
      selectedKeys={selectedKey ? [selectedKey] : []}
      items={visibleItems.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: item.label,
        onClick: () => handleNavigate(item.path),
      }))}
    />
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Desktop/tablet: sidebar pushes content and can collapse to a rail. */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          breakpoint="lg"
          trigger={null}
          theme="light"
          style={{ position: "sticky", top: 0, height: "100vh", overflow: "auto" }}
        >
          <BrandMark showLabel={!collapsed} />
          {menu}
        </Sider>
      )}

      {/* Mobile: sidebar becomes a full-height overlay drawer instead of squeezing the page. */}
      {isMobile && (
        <Drawer
          placement="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          closable={false}
          size={240}
          styles={{ body: { padding: 0 } }}
        >
          <BrandMark showLabel />
          {menu}
        </Drawer>
      )}

      <Layout>
        <Header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            padding: "0 16px",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Space>
            <Button
              type="text"
              icon={
                isMobile ? (
                  <MenuOutlined />
                ) : collapsed ? (
                  <MenuUnfoldOutlined />
                ) : (
                  <MenuFoldOutlined />
                )
              }
              onClick={() => (isMobile ? setMobileOpen(true) : setCollapsed((prev) => !prev))}
            />
            {isMobile && <span style={{ color: BRAND_COLOR, fontWeight: 700 }}>Mamit Admin</span>}
          </Space>
          <Dropdown
            menu={{
              items: [
                {
                  key: "logout",
                  label: "로그아웃",
                  icon: <LogoutOutlined />,
                  onClick: handleLogout,
                },
              ],
            }}
          >
            <Space style={{ cursor: "pointer" }}>
              <Avatar icon={<UserOutlined />} size="small" />
              {!isMobile && (
                <>
                  <Typography.Text>{user?.name}</Typography.Text>
                  {user && <RoleTag role={user.role} />}
                </>
              )}
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: isMobile ? 12 : 16, overflowX: "hidden" }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
