"use client";

import { useEffect, useState } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { apiGet } from "@/lib/api";
import type { AiTrendPoint, KpiGroupBy, KpiRow } from "@/lib/types";

const GROUP_TABS: { value: KpiGroupBy; label: string }[] = [
  { value: "department", label: "Bo'lim" },
  { value: "user", label: "Xodim" },
  { value: "neighborhood", label: "Mahalla" },
  { value: "category", label: "Kategoriya" },
];

function formatHours(value: number | null): string {
  if (value == null) return "—";
  if (value < 24) return `${value} soat`;
  return `${(value / 24).toFixed(1)} kun`;
}

function formatPercent(value: number | null): string {
  return value == null ? "—" : `${value}%`;
}

export default function KpiPage() {
  const [groupBy, setGroupBy] = useState<KpiGroupBy>("department");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rows, setRows] = useState<KpiRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [trend, setTrend] = useState<AiTrendPoint[]>([]);

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
  }, []);

  const chartData = trend.map((p) => ({
    date: p.date.slice(5),
    "Aniqlik (%)": p.accuracy != null ? Math.round(p.accuracy * 100) : null,
    "LLM ulushi (%)": p.llm_share != null ? Math.round(p.llm_share * 100) : null,
  }));

  return (
    <AppShell title="KPI" requireRoles={["manager", "admin"]}>
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
        ) : rows.length === 0 ? (
          <div className="py-14 text-center text-text-muted text-sm">Ma&apos;lumot yo&apos;q</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="py-2 pr-4 font-medium">{GROUP_TABS.find((t) => t.value === groupBy)?.label}</th>
                  <th className="py-2 px-4 font-medium">Jami</th>
                  <th className="py-2 px-4 font-medium">Hal qilingan</th>
                  <th className="py-2 px-4 font-medium">O&apos;rtacha birinchi javob</th>
                  <th className="py-2 px-4 font-medium">O&apos;rtacha hal vaqti</th>
                  <th className="py-2 pl-4 font-medium">SLA %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.key ?? "null"}>
                    <td className="py-3 pr-4 font-medium text-text-primary">{row.label}</td>
                    <td className="py-3 px-4 text-text-secondary">{row.total}</td>
                    <td className="py-3 px-4 text-text-secondary">{row.resolved}</td>
                    <td className="py-3 px-4 text-text-secondary">{formatHours(row.avg_first_response_hours)}</td>
                    <td className="py-3 px-4 text-text-secondary">{formatHours(row.avg_resolution_hours)}</td>
                    <td className="py-3 pl-4 text-text-secondary">{formatPercent(row.sla_percent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-1">AI aniqlik trendi (30 kun)</h2>
        <p className="text-sm text-text-muted mb-4">
          LLM ulushi vaqt o&apos;tishi bilan kamayishi kerak — bu keyword lug&apos;ati o&apos;rganish sikli
          (B2.5) orqali boyib borayotganini bildiradi.
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
              <Line type="monotone" dataKey="LLM ulushi (%)" stroke="var(--purple)" connectNulls dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </AppShell>
  );
}
