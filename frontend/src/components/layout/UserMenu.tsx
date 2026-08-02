"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/status";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function UserMenu() {
  const { user, logout } = useAuth();
  const initials = user ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() : "";
  const [open, setOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Profil menyusi"
        className="flex items-center gap-2.5 rounded-pill -mx-1.5 px-1.5 py-1 hover:bg-bg-subtle transition-colors"
      >
        <div className="h-8 w-8 rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-semibold overflow-hidden shrink-0">
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="hidden sm:block leading-tight text-left">
          <div className="text-sm font-medium text-text-primary">{user?.fullname}</div>
          <div className="text-xs text-text-muted">
            {user?.role ? ROLE_LABELS[user.role] : ""}
            {user?.department_name ? ` — ${user.department_name}` : ""}
          </div>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 rounded-inner border border-border bg-bg-surface shadow-lift overflow-hidden py-1">
          <Link
            href="/admin/profil"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-subtle transition-colors"
          >
            <UserIcon className="h-4 w-4 text-text-secondary" />
            Profil
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              setLogoutConfirmOpen(true);
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-subtle transition-colors"
          >
            <LogOut className="h-4 w-4 text-text-secondary" />
            Chiqish
          </button>
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
    </div>
  );
}
