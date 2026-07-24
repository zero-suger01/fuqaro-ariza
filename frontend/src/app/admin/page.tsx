"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ClipboardList, BarChart3, Building2, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiGet } from "@/lib/api";
import type { Complaint, DashboardStats, StatsResponse } from "@/lib/types";
import { CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/status";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="flex-1 min-w-[140px]">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="text-3xl font-semibold text-text-primary mt-2 font-mono">{value}</p>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<StatsResponse | null>(null);
  const [recent, setRecent] = useState<Complaint[]>([]);

  useEffect(() => {
    apiGet<DashboardStats>("/api/admin/stats/dashboard").then(setStats);
    apiGet<StatsResponse>("/api/admin/stats/charts").then(setCharts);
    apiGet<Complaint[]>("/api/admin/complaints").then((data) => setRecent(data.slice(0, 6)));
  }, []);

  return (
    <AppShell title="Dashboard" requireAdmin>
      <div className="flex flex-col md:flex-row gap-4 flex-wrap">
        <StatCard label="Bugungi murojaatlar" value={stats?.today ?? 0} />
        <StatCard label="Haftalik murojaatlar" value={stats?.this_week ?? 0} />
        <StatCard label="Oy bo'yicha murojaatlar" value={stats?.this_month ?? 0} />
        <StatCard label="Hal qilinganlar" value={stats?.resolved ?? 0} />
        <StatCard label="Jarayondagilar" value={stats?.in_progress ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-text-primary">Murojaatlar dinamikasi</h2>
              <p className="text-sm text-text-muted">Oylar kesimida qabul qilingan murojaatlar</p>
            </div>
            <Link href="/admin/statistika" className="text-sm text-accent font-medium hover:underline flex items-center gap-1">
              Batafsil analitika <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {!charts || charts.monthly.length === 0 ? (
            <div className="py-16 text-center text-text-muted text-sm">Ma&apos;lumot hali mavjud emas</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={charts.monthly}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c9a227" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#c9a227" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e9f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8595ab" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#8595ab" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#c9a227" fill="url(#colorCount)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
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
              href="/admin/statistika"
              className="flex items-center gap-3 rounded-inner border border-border px-4 py-3 text-sm font-medium text-text-primary hover:border-accent transition"
            >
              <BarChart3 className="h-4 w-4 text-accent" /> Statistika
            </Link>
            <Link
              href="/admin/tashkilotlar"
              className="flex items-center gap-3 rounded-inner border border-border px-4 py-3 text-sm font-medium text-text-primary hover:border-accent transition"
            >
              <Building2 className="h-4 w-4 text-accent" /> Tashkilotlar
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">So&apos;nggi faollik</h2>
          <Link href="/admin/murojaatlar" className="text-sm text-accent font-medium hover:underline">
            Barchasini ko&apos;rish
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
                  <p className="text-sm font-medium text-text-primary">{CATEGORY_LABELS[c.category]}</p>
                  <p className="text-xs text-text-muted truncate max-w-lg">{c.description}</p>
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
