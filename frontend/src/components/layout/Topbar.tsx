"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <header className="flex h-14 items-center gap-4 rounded-2xl border border-border bg-bg-surface px-4 shadow-card">
      <h1 className="shrink-0 text-base font-semibold text-text-primary">{title}</h1>
      <div className="flex-1 flex justify-center">
        <QuickSearch />
      </div>
      <NotificationBell />
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-semibold">
          {initials}
        </div>
        <div className="hidden sm:block leading-tight">
          <div className="text-sm font-medium text-text-primary">{user?.fullname}</div>
          <div className="text-xs text-text-muted">
            {user?.role ? ROLE_LABELS[user.role] : ""}
            {user?.department_name ? ` — ${user.department_name}` : ""}
          </div>
        </div>
      </div>
    </header>
  );
}
