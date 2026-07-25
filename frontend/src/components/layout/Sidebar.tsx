"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { LogOut, Menu, ShieldCheck, X, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Jonli hisoblagich (0 bo'lsa ko'rsatilmaydi — bo'sh navbat shovqin qilmasin). */
  count?: number;
  /** Noldan katta hisoblagich qizil bo'ladi (overdue, stuck_ai). */
  danger?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * `href` dagi query bilan birga aktivlikni aniqlaydi.
 *
 * Navbat elementlari bir xil sahifaga turli filtr bilan boradi
 * (`/admin/murojaatlar?queue=overdue`), shuning uchun faqat pathname
 * bo'yicha solishtirsa ularning HAMMASI bir vaqtda aktiv ko'rinardi.
 */
function useIsActive() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQueue = searchParams.get("queue");

  return (href: string) => {
    const [path, query] = href.split("?");
    const wantedQueue = query ? new URLSearchParams(query).get("queue") : null;
    if (pathname !== path && !pathname?.startsWith(path + "/")) return false;
    return wantedQueue === currentQueue;
  };
}

function NavLink({ item, isActive, onNavigate }: { item: NavItem; isActive: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  const showCount = (item.count ?? 0) > 0;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={clsx(
        "group flex items-center gap-3 rounded-pill px-3 py-2.5 text-sm font-medium transition-colors duration-150",
        isActive ? "bg-white/[0.08] text-white" : "text-white/60 hover:bg-white/[0.06] hover:text-white"
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="min-w-0 truncate">{item.label}</span>
      {showCount && (
        <span
          className={clsx(
            "ml-auto shrink-0 rounded-pill px-2 py-0.5 text-xs font-mono font-bold",
            item.danger ? "bg-danger/20 text-danger" : "bg-white/10 text-white"
          )}
        >
          {item.count}
        </span>
      )}
    </Link>
  );
}

/**
 * `useIsActive` `useSearchParams()` ga tayanadi, u esa Suspense chegarasini
 * talab qiladi (Next.js 16). Shuning uchun daraxt `NavTreeBoundary` orqali
 * render qilinadi.
 */
function NavTreeInner({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const isActive = useIsActive();
  return (
    <nav className="flex-1 overflow-y-auto flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          {/* Guruh sarlavhasi bosilmaydi — u yorliq, havola emas (docs/10 §10.2). */}
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/35">
            {group.title}
          </p>
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} isActive={isActive(item.href)} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </nav>
  );
}

function NavTree(props: { groups: NavGroup[]; onNavigate?: () => void }) {
  return (
    <Suspense fallback={<nav className="flex-1" />}>
      <NavTreeInner {...props} />
    </Suspense>
  );
}

export function Sidebar({ groups }: { groups: NavGroup[] }) {
  const { logout } = useAuth();
  // Drawer havola bosilganda `onNavigate` orqali yopiladi — pathname'ga
  // effekt qo'yish shart emas (va React uni kaskadli render deb ogohlantiradi).
  const [drawerOpen, setDrawerOpen] = useState(false);

  const brand = (
    <div className="flex items-center gap-2 px-3 py-2 mb-4">
      <div className="h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center">
        <ShieldCheck className="h-5 w-5 text-accent" />
      </div>
      <span className="text-white font-semibold text-lg">Ariza</span>
    </div>
  );

  const logoutButton = (
    <button
      onClick={logout}
      className="flex items-center gap-3 rounded-pill px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/[0.06] hover:text-white transition-colors duration-150"
    >
      <LogOut className="h-[18px] w-[18px]" />
      Chiqish
    </button>
  );

  return (
    <>
      {/* Desktop — doimiy sidebar */}
      <aside className="hidden md:flex md:flex-col w-[248px] shrink-0 bg-navy-900 text-white/60 h-screen sticky top-0 px-3 py-4">
        {brand}
        <NavTree groups={groups} />
        {logoutButton}
      </aside>

      {/* Mobil (F1.8) — hamburger + drawer. Avval mobil admin menyusi
          umuman yo'q edi: sidebar `hidden md:flex` bo'lgani uchun telefonda
          navigatsiya butunlay yo'qolardi. */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label="Menyuni ochish"
        className="md:hidden fixed left-4 top-4 z-40 h-11 w-11 rounded-full bg-navy-900 text-white flex items-center justify-center shadow-lift"
      >
        <Menu className="h-5 w-5" />
      </button>

      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex flex-col w-[272px] max-w-[85vw] bg-navy-900 text-white/60 h-full px-3 py-4">
            <div className="flex items-start justify-between">
              {brand}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Menyuni yopish"
                className="h-9 w-9 rounded-full text-white/60 hover:text-white flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavTree groups={groups} onNavigate={() => setDrawerOpen(false)} />
            {logoutButton}
          </aside>
        </div>
      )}
    </>
  );
}
