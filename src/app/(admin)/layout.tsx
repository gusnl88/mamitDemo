import { AuthGuard } from "@/components/auth/AuthGuard";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { IdleAutoLogout } from "@/hooks/useIdleAutoLogout";

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <IdleAutoLogout />
      <AdminLayout>{children}</AdminLayout>
    </AuthGuard>
  );
}
