"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Users,
  Tags,
  Lightbulb,
  QrCode,
  Map,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Sidebar, type NavItem } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

const ADMIN_NAV: (NavItem & { roles?: string[] })[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/murojaatlar", label: "Murojaatlar", icon: ClipboardList },
  { href: "/admin/xarita", label: "Xarita", icon: Map },
  { href: "/admin/kpi", label: "KPI", icon: BarChart3, roles: ["manager", "admin"] },
  { href: "/admin/bolimlar", label: "Bo'limlar", icon: Building2, roles: ["admin"] },
  { href: "/admin/xodimlar", label: "Xodimlar", icon: Users, roles: ["admin"] },
  { href: "/admin/kategoriyalar", label: "Kategoriyalar", icon: Tags, roles: ["admin"] },
  { href: "/admin/takliflar", label: "Keyword takliflari", icon: Lightbulb, roles: ["admin"] },
  { href: "/admin/qr", label: "QR kodlar", icon: QrCode, roles: ["admin"] },
];

export function AppShell({
  title,
  requireRoles,
  children,
}: {
  title: string;
  /** Extra role gate on top of "must be logged-in staff" (F2.7 RBAC). */
  requireRoles?: string[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || user.kind !== "staff") {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user || user.kind !== "staff") {
    return (
      <div className="flex h-screen items-center justify-center text-text-muted text-sm">Yuklanmoqda...</div>
    );
  }

  const items = ADMIN_NAV.filter((item) => !item.roles || item.roles.includes(user.role ?? ""));
  const forbidden = requireRoles && !requireRoles.includes(user.role ?? "");

  return (
    <div className="flex min-h-screen">
      <Sidebar items={items} />
      <div className="flex-1 flex flex-col gap-6 p-4 md:p-6 min-w-0">
        <Topbar title={title} />
        <main className="flex-1 flex flex-col gap-6 min-w-0">
          {forbidden ? (
            <div className="flex flex-1 items-center justify-center text-text-muted text-sm py-20">
              Bu sahifa uchun ruxsatingiz yetarli emas
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
