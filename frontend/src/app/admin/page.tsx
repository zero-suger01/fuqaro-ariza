"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Building2, Users, AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiGet } from "@/lib/api";
import type { ComplaintListItem, DashboardStats, Page } from "@/lib/types";
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/status";

function StatCard({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <Card className="flex-1 min-w-[140px]">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className={`text-3xl font-semibold mt-2 font-mono ${danger && value > 0 ? "text-danger" : "text-text-primary"}`}>
        {value}
      </p>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<ComplaintListItem[]>([]);

  useEffect(() => {
    apiGet<DashboardStats>("/api/admin/stats/dashboard").then(setStats);
    apiGet<Page<ComplaintListItem>>("/api/admin/complaints?page=1&page_size=6").then((res) => setRecent(res.items));
  }, []);

  const priorityEntries = Object.entries(stats?.by_priority ?? {}) as [string, number][];

  return (
    <AppShell title="Dashboard">
      <div className="flex flex-col md:flex-row gap-4 flex-wrap">
        <StatCard label="Bugungi murojaatlar" value={stats?.today ?? 0} />
        <StatCard label="Haftalik murojaatlar" value={stats?.this_week ?? 0} />
        <StatCard label="Oy bo'yicha murojaatlar" value={stats?.this_month ?? 0} />
        <StatCard label="Hal qilinganlar" value={stats?.resolved ?? 0} />
        <StatCard label="Jarayondagilar" value={stats?.in_progress ?? 0} />
        <StatCard label="Muddati o'tganlar" value={stats?.overdue ?? 0} danger />
        <StatCard label="AI tekshiruv kerak" value={stats?.needs_review ?? 0} danger />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-text-primary">Muhimlik bo&apos;yicha taqsimot</h2>
              <p className="text-sm text-text-muted">Barcha faol murojaatlar</p>
            </div>
          </div>
          {priorityEntries.length === 0 ? (
            <div className="py-16 text-center text-text-muted text-sm">Ma&apos;lumot hali mavjud emas</div>
          ) : (
            <div className="flex flex-col gap-3">
              {priorityEntries.map(([priority, count]) => {
                const max = Math.max(...priorityEntries.map(([, c]) => c), 1);
                return (
                  <div key={priority}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text-primary font-medium">
                        {PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] ?? priority}
                      </span>
                      <span className="text-text-muted font-mono">{count}</span>
                    </div>
                    <div className="h-2 rounded-pill bg-bg-subtle overflow-hidden">
                      <div
                        className="h-full rounded-pill"
                        style={{
                          width: `${(count / max) * 100}%`,
                          backgroundColor: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] ?? "#8595ab",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
            <div className="h-11 w-11 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-primary font-mono">
                {stats?.ai_accuracy_7d != null ? `${Math.round(stats.ai_accuracy_7d * 100)}%` : "—"}
              </p>
              <p className="text-sm text-text-muted">AI aniqligi (oxirgi 7 kun)</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-text-primary mb-1">Tezkor amallar</h2>
          <p className="text-sm text-text-muted mb-4">Asosiy bo&apos;limlarga o&apos;tish</p>
          <div className="flex flex-col gap-2">
            <Link
              href="/admin/murojaatlar"
              className="flex items-center gap-3 rounded-inner border border-border px-4 py-3 text-sm font-medium text-text-primary hover:border-accent transition"
            >
              <ClipboardList className="h-4 w-4 text-accent" /> Murojaatlar ro&apos;yxati
            </Link>
            <Link
              href="/admin/bolimlar"
              className="flex items-center gap-3 rounded-inner border border-border px-4 py-3 text-sm font-medium text-text-primary hover:border-accent transition"
            >
              <Building2 className="h-4 w-4 text-accent" /> Bo&apos;limlar
            </Link>
            <Link
              href="/admin/xodimlar"
              className="flex items-center gap-3 rounded-inner border border-border px-4 py-3 text-sm font-medium text-text-primary hover:border-accent transition"
            >
              <Users className="h-4 w-4 text-accent" /> Xodimlar
            </Link>
            <Link
              href="/admin/murojaatlar?needs_review=1"
              className="flex items-center gap-3 rounded-inner border border-border px-4 py-3 text-sm font-medium text-text-primary hover:border-accent transition"
            >
              <AlertTriangle className="h-4 w-4 text-warning" /> AI tekshiruv kerak bo&apos;lganlar
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">So&apos;nggi faollik</h2>
          <Link href="/admin/murojaatlar" className="text-sm text-accent font-medium hover:underline flex items-center gap-1">
            Barchasini ko&apos;rish <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="py-10 text-center text-text-muted text-sm">Hozircha murojaatlar qayd etilmagan</div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {recent.map((c) => (
              <Link
                key={c.id}
                href={`/admin/murojaatlar/${c.id}`}
                className="flex items-center justify-between gap-4 py-3 hover:bg-bg-subtle -mx-2 px-2 rounded-inner transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {c.ticket_number} · {c.category.name}
                  </p>
                  <p className="text-xs text-text-muted truncate max-w-lg">
                    {c.citizen.fullname} · {c.citizen.phone}
                  </p>
                </div>
                <Badge label={STATUS_LABELS[c.status]} color={STATUS_COLORS[c.status]} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
