"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { LogOut, ShieldCheck, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="hidden md:flex md:flex-col w-[248px] shrink-0 bg-navy-900 text-white/60 h-screen sticky top-0 px-3 py-4">
      <div className="flex items-center gap-2 px-3 py-2 mb-4">
        <div className="h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-accent" />
        </div>
        <span className="text-white font-semibold text-lg">Ariza</span>
      </div>

      <nav className="flex-1 overflow-y-auto flex flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "group flex items-center gap-3 rounded-pill px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                active ? "bg-white/[0.08] text-white" : "text-white/60 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={logout}
        className="flex items-center gap-3 rounded-pill px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/[0.06] hover:text-white transition-colors duration-150"
      >
        <LogOut className="h-[18px] w-[18px]" />
        Chiqish
      </button>
    </aside>
  );
}
