"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

/** Qidiruv har bir bo'limda o'ziga tegishli narsani qidirishi kerak
 * (mijoz so'ragan) — masalan QR kodlar sahifasida tuman/MFY/ko'cha/izoh
 * bo'yicha, Xodimlarda ism/telefon bo'yicha va h.k. Bu sahifalar o'zining
 * to'liq ro'yxatini allaqachon yuklaydi, shuning uchun qidiruv shu
 * sahifaning o'zida `?q=` orqali (mahalliy filtr) ishlaydi — faqat
 * ro'yxati bo'lmagan/`q`ni o'qimaydigan sahifalarda standart holatda
 * "Barcha murojaatlar"ga (ticket/telefon) o'tadi. */
const LOCAL_SEARCH_PAGES: Record<string, string> = {
  "/admin/qr": "QR kod, tuman, MFY, ko'cha bo'yicha qidirish...",
  "/admin/bolimlar": "Bo'lim nomi yoki kodi bo'yicha qidirish...",
  "/admin/kategoriyalar": "Kategoriya nomi yoki kodi bo'yicha qidirish...",
  "/admin/xodimlar": "Ism, telefon yoki email bo'yicha qidirish...",
};

function QuickSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [prevPathname, setPrevPathname] = useState(pathname);

  const localPlaceholder = LOCAL_SEARCH_PAGES[pathname];

  // Sahifa almashganda qidiruv qutisi shu YANGI sahifaning o'z `q`
  // qiymatini ko'rsatishi kerak (avvalgi sahifadan qolib ketmasin) — render
  // paytida moslashtiramiz ("you might not need an effect" andozasi,
  // frontend/src/app/[locale]/yangi/page.tsx'dagi bilan bir xil naqsh).
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setValue(searchParams.get("q") ?? "");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (localPlaceholder) {
      // Shu sahifaning o'zida qoladi — ro'yxat `q` parametridan mahalliy
      // filtrlaydi (masalan QrCodesPage).
      router.push(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname);
      return;
    }
    if (!q) return;
    router.push(`/admin/murojaatlar?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={submit} className="relative hidden sm:block w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={localPlaceholder ?? "Ticket yoki telefon bo'yicha qidirish..."}
        className="w-full rounded-pill border border-border bg-bg-subtle py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-accent focus:bg-bg-surface"
      />
    </form>
  );
}

export function Topbar({ title, onOpenMenu }: { title: string; onOpenMenu: () => void }) {
  return (
    <header className="sticky top-3 z-20 flex h-16 shrink-0 items-center gap-3 rounded-2xl border border-border bg-bg-surface px-4 shadow-card">
      {/* Mobil hamburger — drawer holati AppShell'da, Sidebar bilan
          bo'lishiladi. Avval bu tugma Sidebar ichida `fixed` edi va shu
          Topbar sarlavhasini bosib turardi (z-index to'qnashuvi). */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Menyuni ochish"
        className="md:hidden -ml-1 h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-subtle transition"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="min-w-0 truncate text-base font-semibold text-text-primary">{title}</h1>
      <div className="flex-1 flex justify-center min-w-0">
        <QuickSearch />
      </div>
      <ThemeToggle />
      <NotificationBell />
      <UserMenu />
    </header>
  );
}
