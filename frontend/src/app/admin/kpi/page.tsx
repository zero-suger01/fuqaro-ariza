"use client";

import { useEffect, useState } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BotMessageSquare, Clock, Route, Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { Table, type Column } from "@/components/ui/Table";
import { apiGet } from "@/lib/api";
import type { AiTrendPoint, DashboardStats, KpiGroupBy, KpiRow } from "@/lib/types";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/status";

const GROUP_TABS: { value: KpiGroupBy; label: string }[] = [
  { value: "department", label: "Bo'lim" },
  { value: "user", label: "Xodim" },
  { value: "neighborhood", label: "Mahalla" },
  { value: "category", label: "Kategoriya" },
];

/**
 * v1.4: bu bloklar bosh ekrandan SHU YERGA ko'chdi (docs/10 §10.1).
 * Bosh ekran «hozir qaysi ishni olish kerak?» degan savolga javob
 * beradi; o'sish dinamikasi va AI aniqligi esa haftalik tahlil
 * vositasi — ular kunlik navbat bilan bir ekranda raqobat qilmasin.
 */
function StatCard({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <Card className="flex-1 min-w-[140px]">
      <p className="text-sm text-text-secondary">{label}</p>
      <p
        className={`text-3xl font-semibold mt-2 font-mono ${
          danger && value > 0 ? "text-danger" : "text-text-primary"
        }`}
      >
        {value}
      </p>
    </Card>
  );
}

/** R0 §8 avtomatlashtirish KPI kartasi — ulush (0–1) yoki soat, maqsad bilan. */
function KpiCard({
  label,
  value,
  target,
  format,
}: {
  label: string;
  value: number | null;
  target: string;
  format: "percent" | "hours";
}) {
  const display = value == null ? "—" : format === "percent" ? `${Math.round(value * 100)}%` : `${value} soat`;
  return (
    <Card className="flex-1 min-w-[160px]">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="text-3xl font-semibold mt-2 font-mono text-text-primary">{display}</p>
      <p className="text-xs text-text-muted mt-1">Maqsad: {target}</p>
    </Card>
  );
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-text-primary font-medium">{label}</span>
        <span className="text-text-muted font-mono">{count}</span>
      </div>
      <div className="h-2 rounded-pill bg-bg-subtle overflow-hidden">
        <div
          className="h-full rounded-pill"
          style={{ width: `${(count / max) * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function formatHours(value: number | null): string {
  if (value == null) return "—";
  if (value < 24) return `${value} soat`;
  return `${(value / 24).toFixed(1)} kun`;
}

function formatPercent(value: number | null): string {
  return value == null ? "—" : `${value}%`;
}

function kpiColumns(groupLabel: string): Column<KpiRow>[] {
  return [
    { key: "label", header: groupLabel, render: (row) => <span className="font-medium text-text-primary">{row.label}</span> },
    { key: "total", header: "Jami", numeric: true, render: (row) => row.total },
    { key: "resolved", header: "Hal qilingan", numeric: true, render: (row) => row.resolved },
    {
      key: "first",
      header: "O'rtacha birinchi javob",
      numeric: true,
      render: (row) => formatHours(row.avg_first_response_hours),
    },
    {
      key: "resolution",
      header: "O'rtacha hal vaqti",
      numeric: true,
      render: (row) => formatHours(row.avg_resolution_hours),
    },
    { key: "sla", header: "Muddatida %", numeric: true, render: (row) => formatPercent(row.sla_percent) },
  ];
}

export default function KpiPage() {
  const [groupBy, setGroupBy] = useState<KpiGroupBy>("department");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rows, setRows] = useState<KpiRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [trend, setTrend] = useState<AiTrendPoint[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ group_by: groupBy });
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the fetch below
    setLoading(true);
    apiGet<KpiRow[]>(`/api/admin/stats/kpi?${params.toString()}`)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [groupBy, dateFrom, dateTo]);

  useEffect(() => {
    apiGet<AiTrendPoint[]>("/api/admin/stats/ai-trend?days=30")
      .then(setTrend)
      .catch(() => setTrend([]));
    apiGet<DashboardStats>("/api/admin/stats/dashboard")
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const priorityEntries = Object.entries(stats?.by_priority ?? {}) as [string, number][];
  const priorityMax = Math.max(...priorityEntries.map(([, count]) => count), 1);
  const neighborhoodMax = stats?.by_neighborhood[0]?.count ?? 1;

  const chartData = trend.map((p) => ({
    date: p.date.slice(5),
    "Aniqlik (%)": p.accuracy != null ? Math.round(p.accuracy * 100) : null,
    "Past ishonch (%)": p.low_confidence_share != null ? Math.round(p.low_confidence_share * 100) : null,
  }));

  return (
    <AppShell title="KPI" requireRoles={["district_admin"]}>
      <div className="flex flex-col md:flex-row gap-4 flex-wrap">
        <StatCard label="Bugungi murojaatlar" value={stats?.today ?? 0} />
        <StatCard label="Haftalik murojaatlar" value={stats?.this_week ?? 0} />
        <StatCard label="Oy bo'yicha murojaatlar" value={stats?.this_month ?? 0} />
        <StatCard label="Hal qilinganlar" value={stats?.resolved ?? 0} />
        <StatCard label="Jarayondagilar" value={stats?.in_progress ?? 0} />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <BotMessageSquare className="h-4 w-4 text-accent" />
          <h2 className="text-base font-semibold text-text-primary">Avtomatlashtirish KPI (7 kun)</h2>
          <p className="text-xs text-text-muted">«AI-powered» — his emas, shu to&apos;rt raqam (docs/00 §5)</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 flex-wrap">
          <KpiCard
            label="Zero-touch yo'naltirish"
            value={stats?.zero_touch_7d ?? null}
            target="≥ 70%"
            format="percent"
          />
          <KpiCard
            label="AI draft asosida javoblar"
            value={stats?.draft_reply_share_7d ?? null}
            target="≥ 60%"
            format="percent"
          />
          <KpiCard
            label="Birinchi harakatgacha"
            value={stats?.avg_first_action_hours_7d ?? null}
            target="≤ 4 soat"
            format="hours"
          />
          <KpiCard
            label="Javob bilan yopilgan"
            value={stats?.resolved_with_reply_7d ?? null}
            target="100%"
            format="percent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-base font-semibold text-text-primary mb-1">Muhimlik bo&apos;yicha taqsimot</h2>
          <p className="text-sm text-text-muted mb-4">Barcha faol murojaatlar</p>
          {priorityEntries.length === 0 ? (
            <div className="py-10 text-center text-text-muted text-sm">Ma&apos;lumot hali mavjud emas</div>
          ) : (
            <div className="flex flex-col gap-3">
              {priorityEntries.map(([priority, count]) => (
                <BarRow
                  key={priority}
                  label={PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] ?? priority}
                  count={count}
                  max={priorityMax}
                  color={PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] ?? "#8595ab"}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-6 mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              {/* Foiz YOLG'IZ ko'rsatilmaydi — yonida namuna hajmi turadi.
                  Bu «AI aniqligi» aslida «tekshirilganlar ichida AI to'g'ri
                  topganlari» degani, va 2 ta tekshiruvdan chiqqan 100% 200 ta
                  tekshiruvdan chiqqani bilan bir xil ko'rinmasligi kerak.
                  Hech kim tekshirmagan bo'lsa — foiz emas, ochiq «hali
                  tekshirilmagan» yoziladi. */}
              <div>
                <p className="text-2xl font-semibold text-text-primary font-mono">
                  {stats?.ai_accuracy_7d != null ? `${Math.round(stats.ai_accuracy_7d * 100)}%` : "—"}
                </p>
                <p className="text-sm text-text-muted">
                  AI aniqligi (7 kun)
                  {stats?.ai_reviewed_7d
                    ? ` · ${stats.ai_reviewed_7d} ta tekshiruvdan`
                    : " · hali tekshirilmagan"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
                <Route className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-text-primary font-mono">{stats?.ai_auto_routed_7d ?? 0}</p>
                <p className="text-sm text-text-muted">AI avtomatik yo&apos;naltirgan</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                <Wrench className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-text-primary font-mono">
                  {stats?.ai_routing_corrected_7d ?? 0}
                </p>
                <p className="text-sm text-text-muted">Admin to&apos;g&apos;irlagan</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-text-primary mb-1">Mahalla kesimi</h2>
          <p className="text-sm text-text-muted mb-4">Eng ko&apos;p murojaat kelgan 5 ta mahalla</p>
          {!stats || stats.by_neighborhood.length === 0 ? (
            <div className="py-10 text-center text-text-muted text-sm">Ma&apos;lumot hali mavjud emas</div>
          ) : (
            <div className="flex flex-col gap-3">
              {stats.by_neighborhood.slice(0, 5).map((n) => (
                <BarRow
                  key={n.neighborhood_id ?? "null"}
                  label={n.neighborhood_name ?? "—"}
                  count={n.count}
                  max={neighborhoodMax}
                  color="var(--accent)"
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex gap-2">
            {GROUP_TABS.map((tab) => (
              <Button
                key={tab.value}
                type="button"
                variant={groupBy === tab.value ? "primary" : "secondary"}
                onClick={() => setGroupBy(tab.value)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-3">
            <div>
              <Label>Sanadan</Label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-control border border-border bg-bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition"
              />
            </div>
            <div>
              <Label>Sanagacha</Label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-control border border-border bg-bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="py-14 text-center text-text-muted text-sm">Yuklanmoqda...</div>
        ) : (
          <Table
            columns={kpiColumns(GROUP_TABS.find((t) => t.value === groupBy)?.label ?? "")}
            rows={rows}
            rowKey={(row) => row.key ?? "null"}
          />
        )}
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-1">AI aniqlik trendi (30 kun)</h2>
        <p className="text-sm text-text-muted mb-4">
          <strong>Aniqlik</strong> — AI tanlagan kategoriya o&apos;zgartirilmasdan qolgan ulush (85% dan pastga tushsa
          model yoki prompt qayta ko&apos;riladi). <strong>Past ishonch</strong> — AI o&apos;zi ikkilangan murojaatlar
          ulushi; ko&apos;payib ketsa kategoriyalar chegarasi noaniq degani.
        </p>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Aniqlik (%)" stroke="var(--success)" connectNulls dot={false} />
              <Line type="monotone" dataKey="Past ishonch (%)" stroke="var(--purple)" connectNulls dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </AppShell>
  );
}
