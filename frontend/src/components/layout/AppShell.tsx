"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Users,
  Tags,
  QrCode,
  Map,
  BarChart3,
  Inbox,
  SquareCheckBig,
  AlertTriangle,
  Clock,
  MessageCircleQuestion,
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
 * Menyu 5 guruhga bo'lingan (docs/10-ui-ux.md §10.2).
 *
 * Avval 9 ta element tekis ro'yxatda turardi va `QR kodlar`,
 * `Kategoriyalar` kunda bir marta ochilmaydigan bo'limlar `Murojaatlar`
 * bilan bir qatorda edi — kunlik ish uchun shovqin.
 *
 * `countKey` — `stats/queues` dagi maydon nomi; hisoblagich shu yerdan
 * keladi va 0 bo'lsa ko'rsatilmaydi.
 */
const ADMIN_NAV: GatedGroup[] = [
  {
    title: "Operatsion navbat",
    items: [
      { href: "/admin", label: "Bosh ekran", icon: LayoutDashboard, roles: ["admin"] },
      { href: "/admin/navbatim", label: "Navbatim", icon: Inbox, roles: ["department_staff"] },
      {
        href: "/admin/murojaatlar?queue=unassigned",
        label: "Biriktirilmagan",
        icon: ClipboardList,
        roles: ["admin"],
        countKey: "unassigned",
      },
      {
        href: "/admin/tasdiqlash",
        label: "AI nazorati",
        icon: SquareCheckBig,
        roles: ["admin"],
        countKey: "ai_exceptions",
      },
      { href: "/admin/murojaatlar?queue=sla_risk", label: "Muddat tugayapti", icon: Clock, countKey: "sla_risk" },
      {
        href: "/admin/murojaatlar?queue=overdue",
        label: "Muddati o'tgan",
        icon: AlertTriangle,
        countKey: "overdue",
        danger: true,
      },
      {
        href: "/admin/murojaatlar?queue=need_info",
        label: "Ma'lumot kutilmoqda",
        icon: MessageCircleQuestion,
        countKey: "awaiting_info",
      },
      // «Barcha murojaatlar» shu guruhning oxirida — filtrsiz ro'yxat.
      //
      // Avval u alohida `Murojaatlar` guruhida turardi, lekin o'lik
      // «Eksport» elementi olib tashlangach guruhda bitta element qolib,
      // sarlavha ortiqcha shovqinga aylandi. Proximity bo'yicha joyi ham
      // aynan shu yer: yuqoridagi navbatlarning aksariyati AYNAN shu
      // sahifaning filtrlangan ko'rinishlari (`?queue=...`), demak ular
      // bitta oilaga tegishli. Tartibi oxirida — avval «nima harakat
      // talab qiladi», keyin «yoki hammasini ko'rish».
      //
      // Eslatma: eksport uchun alohida menyu elementi YO'Q va bo'lmasin —
      // sabab docs/10 §10.2 da yozilgan.
      { href: "/admin/murojaatlar", label: "Barcha murojaatlar", icon: List },
    ],
  },
  {
    title: "Monitoring",
    items: [
      { href: "/admin/kpi", label: "KPI", icon: BarChart3, roles: ["admin"] },
      { href: "/admin/xarita", label: "Xarita", icon: Map, roles: ["admin"] },
    ],
  },
  {
    title: "Sozlamalar",
    items: [
      { href: "/admin/bolimlar", label: "Bo'limlar", icon: Building2, roles: ["admin"] },
      { href: "/admin/xodimlar", label: "Xodimlar", icon: Users, roles: ["admin"] },
      { href: "/admin/kategoriyalar", label: "Kategoriyalar", icon: Tags, roles: ["admin"] },
    ],
  },
  {
    title: "Vositalar",
    items: [
      { href: "/admin/qr", label: "QR kodlar", icon: QrCode, roles: ["admin"] },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText, roles: ["admin"] },
    ],
  },
];

function visibleGroups(role: string, queues: QueueStats | null): NavGroup[] {
  return ADMIN_NAV.map((group) => ({
    title: group.title,
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

  // Navbat hisoblagichlari faqat adminda — `stats/queues` admin-only
  // (department_staff uchun 403 bo'lardi).
  useEffect(() => {
    if (user?.role !== "admin") return;
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
