"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import Image from "next/image";
import { LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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
 *
 * Yana bir holat shu yerda tuzatiladi: `/admin` (Bosh ekran) — prefiks
 * emas, ANIQ mos kelishi kerak, aks holda u `/admin/*` ostidagi HAR BIR
 * sahifada aktiv ko'rinardi.
 *
 * Avval bu yerda `export` parametri ham solishtirilardi — u faqat
 * `Eksport` menyu elementi uchun kerak edi, element esa o'lik bo'lgani
 * uchun olib tashlandi (AppShell izohiga qarang). Endi eski
 * `?export=1` havolasi bilan kelingan sahifada `Barcha murojaatlar`
 * to'g'ri aktiv bo'ladi.
 */
function useIsActive() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (href: string) => {
    const [path, query] = href.split("?");
    const pathMatches = pathname === path || (path !== "/admin" && pathname?.startsWith(path + "/"));
    if (!pathMatches) return false;

    const wanted = new URLSearchParams(query ?? "");
    return (wanted.get("queue") ?? null) === searchParams.get("queue");
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
        // Fitts: <md da faqat drawer ko'rinadi, u yerda nishon ≥44px
        // bo'lishi shart (barmoq); desktopda sichqoncha aniqroq, shuning
        // uchun zichroq qolaveradi.
        "group flex items-center gap-2.5 rounded-pill px-3 py-3 md:py-2 text-[13px] font-medium transition-colors duration-150",
        isActive
          ? "bg-sidebar-active-bg text-sidebar-active-text font-semibold"
          : "text-sidebar-text hover:bg-sidebar-hover-bg hover:text-sidebar-text-hover"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate">{item.label}</span>
      {showCount && (
        <span
          className={clsx(
            "ml-auto shrink-0 rounded-pill px-1.5 py-0.5 text-[10px] font-mono font-semibold tabular-nums",
            item.danger
              ? "bg-sidebar-danger-bg text-sidebar-danger"
              : "bg-sidebar-badge-bg text-sidebar-text-muted"
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
    <nav className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1">
      {groups.map((group, i) => (
        <div key={group.title} className={clsx("flex flex-col gap-0.5 py-2.5", i > 0 && "border-t border-border")}>
          {/* Guruh sarlavhasi bosilmaydi — u yorliq, havola emas (docs/10 §10.2). */}
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-text-muted">
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
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const brand = (
    <div className="px-3 py-2 mb-4">
      <Image
        src="/logo-header.png"
        alt="e-Murojaat"
        width={125}
        height={36}
        priority
        className="h-9 w-auto object-contain"
      />
    </div>
  );

  const logoutButton = (
    <button
      onClick={() => setLogoutConfirmOpen(true)}
      className="flex items-center gap-2.5 rounded-pill px-3 py-3 md:py-2 text-[13px] font-medium text-sidebar-text hover:bg-sidebar-hover-bg hover:text-sidebar-text-hover transition-colors duration-150"
    >
      <LogOut className="h-4 w-4" />
      Chiqish
    </button>
  );

  return (
    <>
      {/* Desktop — doimiy sidebar. "Floating" panel (chekka-chekkasiga
          yopishmagan, yumaloq burchakli), `bg-app` fonida suzib turadi.
          Fon — «Ishkor» palitrasining petrol qobig'i (`--shell`, #0d3138):
          light/dark/theme-admin'dan mustaqil brend sirti, shuning uchun
          alohida `--sidebar-*` tokenlar orqali beriladi (docs/10 §7.1). */}
      <aside className="hidden md:flex md:flex-col w-[248px] shrink-0 bg-sidebar-bg border border-sidebar-border text-sidebar-text h-[calc(100vh-1.5rem)] sticky top-3 my-3 ml-3 rounded-[28px] px-3 py-4">
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
        className="md:hidden fixed left-4 top-4 z-40 h-11 w-11 rounded-full bg-bg-surface border border-border text-text-primary flex items-center justify-center shadow-lift"
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
          <aside className="relative flex flex-col w-[272px] max-w-[85vw] bg-sidebar-bg border-r border-sidebar-border text-sidebar-text h-full px-3 py-4">
            <div className="flex items-start justify-between">
              {brand}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Menyuni yopish"
                className="h-9 w-9 rounded-full text-sidebar-text hover:text-sidebar-text-hover flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavTree groups={groups} onNavigate={() => setDrawerOpen(false)} />
            {logoutButton}
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Tizimdan chiqish"
        description="Rostdan tizimdan chiqmoqchimisiz?"
        confirmLabel="Chiqish"
        danger
        onConfirm={logout}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </>
  );
}
