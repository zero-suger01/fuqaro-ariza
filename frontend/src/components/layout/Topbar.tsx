"use client";

import { Bell } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/status";

export function Topbar({ title }: { title: string }) {
  const { user } = useAuth();
  const initials = user ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() : "";

  return (
    <header className="flex h-16 items-center gap-4 rounded-pill border border-border bg-bg-surface px-5 shadow-lift">
      <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
      <div className="flex-1" />
      <button className="h-9 w-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-subtle transition">
        <Bell className="h-[18px] w-[18px]" />
      </button>
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-semibold">
          {initials}
        </div>
        <div className="hidden sm:block leading-tight">
          <div className="text-sm font-medium text-text-primary">{user?.fullname}</div>
          <div className="text-xs text-text-muted">{user?.role ? ROLE_LABELS[user.role] : ""}</div>
        </div>
      </div>
    </header>
  );
}
