"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import Image from "next/image";
import { LogOut, X, type LucideIcon } from "lucide-react";
import { GildedRule, GirihField } from "@/components/motifs";
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
        "press group relative flex items-center gap-2.5 rounded-pill px-3 py-3 md:py-2 text-[13px] font-medium",
        isActive
          ? "bg-sidebar-active-bg text-sidebar-active-text font-bold"
          : "text-sidebar-text hover:bg-sidebar-hover-bg hover:text-sidebar-text-hover"
      )}
    >
      {/* Latun tirgak — aktivlikni fon bilan birga IKKINCHI signal orqali
          ham beradi. Faqat fon rangiga tayanish to'q sirtda zaif: yorug'lik
          past bo'lgan ekranda ikki holat deyarli farqlanmasdi. */}
      {isActive && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brass"
        />
      )}
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

export function Sidebar({
  groups,
  drawerOpen,
  onDrawerOpenChange,
}: {
  groups: NavGroup[];
  /** Drawer holati Topbar bilan bo'lishiladi — hamburger tugma endi shu
   * yerda emas, Topbar'ning o'zida render qilinadi (aks holda `fixed`
   * tugma sticky Topbar sarlavhasini bosib turardi, mobilda). */
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
}) {
  const { logout } = useAuth();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const brand = (
    <div className="px-3 pb-3 pt-1">
      <Image
        src="/logo-header.png"
        alt="e-Murojaat"
        width={125}
        height={36}
        priority
        className="h-9 w-auto object-contain"
      />
      <GildedRule width={180} color="var(--brass)" opacity={0.7} className="mt-3 max-w-full" />
    </div>
  );

  const logoutButton = (
    <button
      onClick={() => setLogoutConfirmOpen(true)}
      className="press mt-1 flex items-center gap-2.5 rounded-pill px-3 py-3 md:py-2 text-[13px] font-semibold text-sidebar-text hover:bg-sidebar-hover-bg hover:text-sidebar-text-hover"
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
      <aside className="night-panel night-panel--gilded hidden md:flex md:flex-col w-[248px] shrink-0 border border-sidebar-border text-sidebar-text h-[calc(100vh-1.5rem)] sticky top-3 my-3 ml-3 rounded-[28px] px-3 py-4">
        <GirihField color="#FFFFFF" opacity={0.06} tile={112} />
        <div className="relative flex min-h-0 flex-1 flex-col">
          {brand}
          <NavTree groups={groups} />
          {logoutButton}
        </div>
      </aside>

      {/* Mobil (F1.8) — drawer. Avval mobil admin menyusi umuman yo'q edi:
          sidebar `hidden md:flex` bo'lgani uchun telefonda navigatsiya
          butunlay yo'qolardi. Ochish tugmasi Topbar'da (hamburger). */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => onDrawerOpenChange(false)}
            aria-hidden="true"
          />
          <aside className="night-panel relative flex flex-col w-[272px] max-w-[85vw] border-r border-sidebar-border text-sidebar-text h-full px-3 py-4">
            <GirihField color="#FFFFFF" opacity={0.06} tile={112} />
            <div className="relative flex items-start justify-between">
              {brand}
              <button
                type="button"
                onClick={() => onDrawerOpenChange(false)}
                aria-label="Menyuni yopish"
                className="h-9 w-9 rounded-full text-sidebar-text hover:text-sidebar-text-hover flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative flex min-h-0 flex-1 flex-col">
              <NavTree groups={groups} onNavigate={() => onDrawerOpenChange(false)} />
              {logoutButton}
            </div>
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
