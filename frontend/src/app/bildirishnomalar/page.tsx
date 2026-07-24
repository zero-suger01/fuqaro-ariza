"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { apiGet, apiPatch } from "@/lib/api";

interface NotificationItem {
  id: string;
  message: string;
  is_read: boolean;
  complaint_id: string | null;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<NotificationItem[]>("/api/notifications")
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  function markRead(id: string) {
    apiPatch(`/api/notifications/${id}/read`).then(() => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    });
  }

  return (
    <AppShell title="Bildirishnomalar">
      <Card>
        {loading ? (
          <div className="py-10 text-center text-text-muted text-sm">Yuklanmoqda...</div>
        ) : items.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 text-text-muted text-sm">
            <BellOff className="h-6 w-6" />
            Hozircha bildirishnomalar yo&apos;q
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                className="flex items-start gap-3 py-3.5 text-left hover:bg-bg-subtle -mx-2 px-2 rounded-inner transition"
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    n.is_read ? "bg-bg-subtle text-text-muted" : "bg-accent-soft text-accent"
                  }`}
                >
                  <Bell className="h-4 w-4" />
                </div>
                <p className={`text-sm ${n.is_read ? "text-text-muted" : "text-text-primary font-medium"}`}>
                  {n.message}
                </p>
              </button>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
