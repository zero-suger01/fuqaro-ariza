"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Building2,
  Users,
  AlertTriangle,
  Clock,
  ArrowRight,
  Route,
  Wrench,
  Cpu,
  BotMessageSquare,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiGet } from "@/lib/api";
import type { AiHealth, ComplaintListItem, DashboardStats, Page } from "@/lib/types";
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
  const display =
    value == null ? "—" : format === "percent" ? `${Math.round(value * 100)}%` : `${value} soat`;
  return (
    <Card className="flex-1 min-w-[160px]">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="text-3xl font-semibold mt-2 font-mono text-text-primary">{display}</p>
      <p className="text-xs text-text-muted mt-1">Maqsad: {target}</p>
    </Card>
  );
}

/** R1/Q4 — AI salomatlik indikatori: LLM jim o'lishi endi ko'rinadigan hodisa. */
function AiHealthStrip({ health }: { health: AiHealth | null }) {
  if (!health) return null;
  const lastText = health.last_llm_success_at
    ? new Date(health.last_llm_success_at).toLocaleString("uz-UZ")
    : "hali javob yo'q";
  return (
    <Card className={health.ollama_ok ? "border border-success/40" : "border-2 border-danger"}>
      <div className="flex items-center gap-3 flex-wrap text-sm">
        <span className="flex items-center gap-2 font-semibold text-text-primary">
          <Cpu className={`h-4 w-4 ${health.ollama_ok ? "text-success" : "text-danger"}`} />
          AI dvigatel ({health.model}):
          <span className={health.ollama_ok ? "text-success" : "text-danger"}>
            {health.ollama_ok ? "ishlayapti" : "JAVOB BERMAYAPTI"}
          </span>
        </span>
        <span className="text-text-muted">Oxirgi javob: {lastText}</span>
        <span className={health.pending_analysis > 0 ? "text-warning font-medium" : "text-text-muted"}>
          Tahlil kutmoqda: {health.pending_analysis} murojaat
        </span>
        {health.llm_errors_1h > 0 && (
          <span className="text-warning font-medium">Oxirgi soatda {health.llm_errors_1h} xato</span>
        )}
        {!health.stt_ok && <span className="text-warning font-medium">STT oxirgi ishi xato</span>}
      </div>
      {!health.ollama_ok && (
        <p className="text-xs text-danger mt-2">
          Ollama javob bermayapti — yangi murojaatlar kategoriyalanmayapti va bo&apos;limlarga yo&apos;naltirilmayapti.
          Ular yo&apos;qolmaydi: tizim har 15 daqiqada qayta uradi va Ollama tiklanishi bilan navbat o&apos;zi
          ishlab ketadi. Serverda <code className="font-mono">ollama serve</code> va model nomini tekshiring.
        </p>
      )}
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [health, setHealth] = useState<AiHealth | null>(null);
  const [recent, setRecent] = useState<ComplaintListItem[]>([]);

  useEffect(() => {
    apiGet<DashboardStats>("/api/admin/stats/dashboard").then(setStats);
    apiGet<AiHealth>("/api/admin/stats/ai-health").then(setHealth).catch(() => {});
    apiGet<Page<ComplaintListItem>>("/api/admin/complaints?page=1&page_size=6").then((res) => setRecent(res.items));
  }, []);

  const priorityEntries = Object.entries(stats?.by_priority ?? {}) as [string, number][];

  return (
    <AppShell title="Dashboard" requireRoles={["admin"]}>
      <AiHealthStrip health={health} />

      <div className="flex flex-col md:flex-row gap-4 flex-wrap">
        <StatCard label="Bugungi murojaatlar" value={stats?.today ?? 0} />
        <StatCard label="Haftalik murojaatlar" value={stats?.this_week ?? 0} />
        <StatCard label="Oy bo'yicha murojaatlar" value={stats?.this_month ?? 0} />
        <StatCard label="Hal qilinganlar" value={stats?.resolved ?? 0} />
        <StatCard label="Jarayondagilar" value={stats?.in_progress ?? 0} />
        <StatCard label="Muddati o'tganlar" value={stats?.overdue ?? 0} danger />
        <StatCard label="AI tekshiruv kerak" value={stats?.needs_review ?? 0} danger />
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

          <div className="flex flex-wrap items-center gap-6 mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
                <Route className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-text-primary font-mono">{stats?.ai_auto_routed_7d ?? 0}</p>
                <p className="text-sm text-text-muted">AI avtomatik yo&apos;naltirgan (7 kun)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                <Wrench className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-text-primary font-mono">{stats?.ai_routing_corrected_7d ?? 0}</p>
                <p className="text-sm text-text-muted">Admin to&apos;g&apos;irlagan (7 kun)</p>
              </div>
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
              href="/admin/tasdiqlash"
              className="flex items-center gap-3 rounded-inner border border-border px-4 py-3 text-sm font-medium text-text-primary hover:border-accent transition"
            >
              <AlertTriangle className="h-4 w-4 text-warning" /> Tasdiqlash navbati
              {(stats?.needs_review ?? 0) > 0 && (
                <span className="ml-auto text-xs font-mono font-bold rounded-pill bg-danger/10 text-danger px-2 py-0.5">
                  {stats?.needs_review}
                </span>
              )}
            </Link>
          </div>
        </Card>
      </div>

      {stats && stats.by_neighborhood.length > 0 && (
        <Card>
          <h2 className="text-base font-semibold text-text-primary mb-1">Mahalla kesimi</h2>
          <p className="text-sm text-text-muted mb-4">Eng ko&apos;p murojaat kelgan 5 ta mahalla</p>
          <div className="flex flex-col gap-3">
            {stats.by_neighborhood.slice(0, 5).map((n) => {
              const max = stats.by_neighborhood[0]?.count ?? 1;
              return (
                <div key={n.neighborhood_id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-primary font-medium">{n.neighborhood_name}</span>
                    <span className="text-text-muted font-mono">{n.count}</span>
                  </div>
                  <div className="h-2 rounded-pill bg-bg-subtle overflow-hidden">
                    <div
                      className="h-full rounded-pill bg-accent"
                      style={{ width: `${(n.count / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

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
