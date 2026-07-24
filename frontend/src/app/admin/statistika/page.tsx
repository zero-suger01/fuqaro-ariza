"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Clock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import type { StatsResponse } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/status";
import type { ComplaintCategory } from "@/lib/types";

const PIE_COLORS = ["#c9a227", "#3d6fb4", "#2e9e6b", "#d9a441", "#8e44ad", "#c0392b", "#2b4e8a", "#51637a", "#8595ab", "#1b3a66"];

function labelFor(category: string) {
  return CATEGORY_LABELS[category as ComplaintCategory] ?? category;
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    apiGet<StatsResponse>("/api/admin/stats/charts").then(setStats);
  }, []);

  const monthly = stats?.monthly ?? [];
  const byCategory = (stats?.by_category ?? []).map((d) => ({ ...d, label: labelFor(d.category) }));
  const topIssues = stats?.top_issues ?? [];

  return (
    <AppShell title="Statistika" requireAdmin>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-base font-semibold text-text-primary mb-4">Oy bo&apos;yicha murojaatlar</h2>
          {monthly.length === 0 ? (
            <div className="py-16 text-center text-text-muted text-sm">Ma&apos;lumot hali mavjud emas</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e9f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8595ab" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#8595ab" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#c9a227" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-text-primary mb-4">Kategoriya bo&apos;yicha</h2>
          {byCategory.length === 0 ? (
            <div className="py-16 text-center text-text-muted text-sm">Ma&apos;lumot hali mavjud emas</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byCategory} dataKey="count" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-text-primary mb-4">Hal qilish vaqti</h2>
          <div className="flex items-center gap-4 py-4">
            <div className="h-14 w-14 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-3xl font-semibold text-text-primary font-mono">
                {stats?.resolution_time.average_hours != null ? `${stats.resolution_time.average_hours} soat` : "—"}
              </p>
              <p className="text-sm text-text-muted mt-1">
                O&apos;rtacha hal qilish vaqti ({stats?.resolution_time.resolved_count ?? 0} ta murojaat asosida)
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-text-primary mb-4">Eng ko&apos;p uchraydigan muammolar</h2>
          {topIssues.length === 0 ? (
            <div className="py-16 text-center text-text-muted text-sm">Ma&apos;lumot hali mavjud emas</div>
          ) : (
            <div className="flex flex-col gap-3">
              {topIssues.map((issue, i) => {
                const max = topIssues[0]?.count || 1;
                return (
                  <div key={issue.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text-primary font-medium">{labelFor(issue.category)}</span>
                      <span className="text-text-muted font-mono">{issue.count}</span>
                    </div>
                    <div className="h-2 rounded-pill bg-bg-subtle overflow-hidden">
                      <div
                        className="h-full rounded-pill"
                        style={{
                          width: `${(issue.count / max) * 100}%`,
                          backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
