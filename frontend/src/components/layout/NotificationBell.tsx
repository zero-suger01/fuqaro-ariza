"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type { NotificationItem } from "@/lib/types";

const POLL_MS = 60_000;

/** R1: Topbar qo'ng'irog'i endi haqiqiy — /api/notifications'ga ulangan
 * (eskalatsiya, SLA ogohlantirishi, biriktirish xabarlari shu yerda). */
export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    apiGet<NotificationItem[]>("/api/notifications")
      .then(setItems)
      .catch(() => {
        /* qo'ng'iroq yiqilsa panel ishlayveradi */
      });
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const unread = items.filter((n) => !n.is_read).length;

  async function openNotification(n: NotificationItem) {
    setOpen(false);
    if (!n.is_read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      apiPatch(`/api/notifications/${n.id}/read`).catch(() => {});
    }
    if (n.complaint_id) router.push(`/admin/murojaatlar/${n.complaint_id}`);
  }

  async function readAll() {
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    apiPost("/api/notifications/read-all").catch(() => {});
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Bildirishnomalar: ${unread} ta o'qilmagan` : "Bildirishnomalar"}
        className="relative h-9 w-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-subtle transition"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-inner border border-border bg-bg-surface shadow-lift overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <span className="text-sm font-semibold text-text-primary">Bildirishnomalar</span>
            {unread > 0 && (
              <button
                onClick={readAll}
                className="flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Hammasini o&apos;qildi
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-text-muted text-center">Bildirishnomalar yo&apos;q</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-bg-subtle transition ${
                    n.is_read ? "" : "bg-accent-soft/40"
                  }`}
                >
                  <p className={`text-sm ${n.is_read ? "text-text-secondary" : "text-text-primary font-medium"}`}>
                    {n.message}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {new Date(n.created_at).toLocaleString("uz-UZ")}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
