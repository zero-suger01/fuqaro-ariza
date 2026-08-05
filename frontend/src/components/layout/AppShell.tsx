"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Tags,
  QrCode,
  Map,
  BarChart3,
  Inbox,
  SquareCheckBig,
  ScrollText,
  List,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { QueueStats } from "@/lib/types";
import { Sidebar, type NavGroup, type NavItem } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

type GatedItem = NavItem & { roles?: string[]; countKey?: keyof QueueStats };
type GatedGroup = { title: string; items: GatedItem[] };

/**
 * Menyu guruhlari (v2.0).
 *
 * Avval «Operatsion navbat» guruhida tuman admini uchun 7 ta element
 * turardi va ularning BESHTASI aynan bitta sahifaning `?queue=`
 * ko'rinishlari edi (`/admin/murojaatlar`). Ya'ni navigatsiya beshta
 * boshqa joy va'da qilib, har safar o'sha bitta jadvalga olib borardi —
 * «qayerdaman?» degan savolga javob yo'q edi. Yana bir nusxa bosh
 * ekranda ham turardi, demak admin bir xil beshta raqamni har ekranda
 * ikki marta ko'rardi.
 *
 * Endi mas'uliyat bo'lingan:
 *   bosh ekran — triage («bugun nima meni kutyapti»),
 *   menyu      — navigatsiya (raqamlarsiz, faqat JOYlar),
 *   navbatlar  — ro'yxat sahifasining ustidagi chiplar, ya'ni qaror
 *                qabul qilinadigan joyda.
 *
 * `AI nazorati` chip emas, menyuda qoladi: u filtr emas, alohida ish
 * oqimiga ega sahifa (`/admin/tasdiqlash` — AI qarorini tasdiqlash yoki
 * tuzatish).
 *
 * `countKey` — `stats/queues` dagi maydon nomi; hisoblagich shu yerdan
 * keladi va 0 bo'lsa ko'rsatilmaydi.
 */
const ADMIN_NAV: GatedGroup[] = [
  {
    title: "Operatsion navbat",
    items: [
      { href: "/admin", label: "Bosh ekran", icon: LayoutDashboard, roles: ["district_admin", "system_admin"] },
      { href: "/admin/viloyat", label: "Viloyat monitoringi", icon: BarChart3, roles: ["province_admin", "system_admin"] },
      { href: "/admin/hududlar", label: "Hududlar", icon: Map, roles: ["system_admin"] },
      { href: "/admin/navbatim", label: "Navbatim", icon: Inbox, roles: ["department_staff"] },
      { href: "/admin/murojaatlar", label: "Murojaatlar", icon: List, roles: ["district_admin"] },
      {
        href: "/admin/tasdiqlash",
        label: "AI nazorati",
        icon: SquareCheckBig,
        roles: ["district_admin"],
        countKey: "ai_exceptions",
      },
    ],
  },
  {
    title: "Monitoring",
    items: [
      { href: "/admin/kpi", label: "KPI", icon: BarChart3, roles: ["district_admin"] },
      { href: "/admin/xarita", label: "Xarita", icon: Map, roles: ["district_admin"] },
    ],
  },
  {
    title: "Sozlamalar",
    items: [
      { href: "/admin/bolimlar", label: "Bo'limlar", icon: Building2, roles: ["district_admin", "system_admin"] },
      { href: "/admin/xodimlar", label: "Xodimlar", icon: Users, roles: ["district_admin", "system_admin"] },
      { href: "/admin/kategoriyalar", label: "Kategoriyalar", icon: Tags, roles: ["district_admin", "system_admin"] },
    ],
  },
  {
    title: "Vositalar",
    items: [
      { href: "/admin/qr", label: "QR kodlar", icon: QrCode, roles: ["district_admin"] },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText, roles: ["district_admin", "system_admin"] },
    ],
  },
];

function visibleGroups(role: string, queues: QueueStats | null): NavGroup[] {
  return ADMIN_NAV.map((group) => ({
    title:
      group.title === "Operatsion navbat" && role === "system_admin"
        ? "Boshqaruv"
        : group.title === "Operatsion navbat" && role === "province_admin"
          ? "Viloyat monitoringi"
          : group.title,
    items: group.items
      .filter((item) => !item.roles || item.roles.includes(role))
      .map((item) => ({
        href: item.href,
        label: item.label,
        icon: item.icon,
        danger: item.danger,
        count: item.countKey && queues ? (queues[item.countKey] as number) : undefined,
      })),
  })).filter((group) => group.items.length > 0); // bo'sh guruh render qilinmaydi
}

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
  const [queues, setQueues] = useState<QueueStats | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.kind !== "staff") {
      router.replace("/login");
      return;
    }
    // v1.4: standart parol bilan ishlab ketishga yo'l qo'yilmaydi.
    if (user.must_change_password) {
      router.replace("/parol");
    }
  }, [user, loading, router]);

  // Navbat hisoblagichlari faqat tuman operatsion adminida kerak.
  useEffect(() => {
    if (user?.role !== "district_admin") return;
    apiGet<QueueStats>("/api/admin/stats/queues")
      .then(setQueues)
      .catch(() => setQueues(null));
  }, [user?.role]);

  if (loading || !user || user.kind !== "staff") {
    return (
      <div className="flex h-screen items-center justify-center text-text-muted text-sm">Yuklanmoqda...</div>
    );
  }

  const groups = visibleGroups(user.role ?? "", queues);
  const forbidden = requireRoles && !requireRoles.includes(user.role ?? "");

  return (
    <div className="flex min-h-screen">
      <Sidebar groups={groups} drawerOpen={drawerOpen} onDrawerOpenChange={setDrawerOpen} />
      <div className="flex-1 flex flex-col gap-6 pt-3 px-4 pb-4 md:px-6 md:pb-6 min-w-0">
        <Topbar title={title} onOpenMenu={() => setDrawerOpen(true)} />
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
