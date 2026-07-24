"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus2,
  ClipboardList,
  Bell,
  BarChart3,
  Building2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Sidebar, type NavItem } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

const USER_NAV: NavItem[] = [
  { href: "/", label: "Bosh sahifa", icon: LayoutDashboard },
  { href: "/ariza/yangi", label: "Ariza yuborish", icon: FilePlus2 },
  { href: "/murojaatlarim", label: "Mening murojaatlarim", icon: ClipboardList },
  { href: "/bildirishnomalar", label: "Bildirishnomalar", icon: Bell },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/murojaatlar", label: "Murojaatlar", icon: ClipboardList },
  { href: "/admin/statistika", label: "Statistika", icon: BarChart3 },
  { href: "/admin/tashkilotlar", label: "Tashkilotlar", icon: Building2 },
];

export function AppShell({
  title,
  requireAdmin = false,
  children,
}: {
  title: string;
  requireAdmin?: boolean;
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (requireAdmin && user.role !== "admin") {
      router.replace("/");
    }
  }, [user, loading, requireAdmin, router]);

  if (loading || !user || (requireAdmin && user.role !== "admin")) {
    return (
      <div className="flex h-screen items-center justify-center text-text-muted text-sm">Yuklanmoqda...</div>
    );
  }

  const items = user.role === "admin" ? ADMIN_NAV : USER_NAV;

  return (
    <div className="flex min-h-screen">
      <Sidebar items={items} />
      <div className="flex-1 flex flex-col gap-6 p-4 md:p-6 min-w-0">
        <Topbar title={title} />
        <main className="flex-1 flex flex-col gap-6 min-w-0">{children}</main>
      </div>
    </div>
  );
}
