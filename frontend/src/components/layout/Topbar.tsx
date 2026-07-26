"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/status";
import { NotificationBell } from "@/components/layout/NotificationBell";

/** Har qanday sahifadan ticket/telefon bo'yicha tezkor qidiruv — Barcha
 * murojaatlar sahifasining `q` filtriga to'g'ridan-to'g'ri o'tadi
 * (docs/10 admin redesign — topbar "bo'sh joy"ni ishlatishi kerak). */
function QuickSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    router.push(`/admin/murojaatlar?q=${encodeURIComponent(value.trim())}`);
  }

  return (
    <form onSubmit={submit} className="relative hidden sm:block w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ticket yoki telefon bo'yicha qidirish..."
        className="w-full rounded-pill border border-border bg-bg-subtle py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-accent focus:bg-bg-surface"
      />
    </form>
  );
}

export function Topbar({ title }: { title: string }) {
  const { user } = useAuth();
  const initials = user ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() : "";

  return (
    <header className="sticky top-4 md:top-6 z-20 flex h-14 shrink-0 items-center gap-4 rounded-2xl border border-border bg-bg-surface px-4 shadow-card">
      <h1 className="shrink-0 text-base font-semibold text-text-primary">{title}</h1>
      <div className="flex-1 flex justify-center">
        <QuickSearch />
      </div>
      <NotificationBell />
      <Link href="/admin/profil" className="flex items-center gap-2.5 rounded-pill -mx-1.5 px-1.5 py-1 hover:bg-bg-subtle transition-colors">
        <div className="h-8 w-8 rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-semibold overflow-hidden shrink-0">
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="hidden sm:block leading-tight">
          <div className="text-sm font-medium text-text-primary">{user?.fullname}</div>
          <div className="text-xs text-text-muted">
            {user?.role ? ROLE_LABELS[user.role] : ""}
            {user?.department_name ? ` — ${user.department_name}` : ""}
          </div>
        </div>
      </Link>
    </header>
  );
}
