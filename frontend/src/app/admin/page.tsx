"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Clock,
  Cpu,
  MessageCircleQuestion,
  SquareCheckBig,
  ZapOff,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, type Column } from "@/components/ui/Table";
import { apiGet } from "@/lib/api";
import type { AiHealth, ComplaintListItem, DepartmentQueueRow, Page, QueueStats } from "@/lib/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/status";

/**
 * Navbat kartasi — bosh ekranning asosiy elementi (docs/10 §10.1).
 *
 * Raqam va ochiladigan ro'yxat bitta backend shartidan chiqadi
 * (`services/queues.py`), shuning uchun karta bosilganda ko'rinadigan
 * ro'yxat soni doim mos keladi.
 *
 * Nol bo'lgan karta muted — bo'sh navbat diqqatni tortmasligi kerak.
 */
function QueueCard({
  label,
  hint,
  value,
  href,
  icon: Icon,
  danger,
}: {
  label: string;
  hint: string;
  value: number | undefined;
  href: string;
  icon: LucideIcon;
  danger?: boolean;
}) {
  const count = value ?? 0;
  const empty = count === 0;
  const alarming = !empty && danger;

  return (
    <Link
      href={href}
      aria-disabled={empty}
      className={clsx(
        "flex-1 min-w-[168px] rounded-card border bg-bg-surface px-5 py-4 shadow-sm transition",
        empty
          ? "border-border opacity-60 hover:opacity-100"
          : alarming
            ? "border-danger/60 hover:border-danger"
            : "border-border hover:border-accent"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={clsx("h-4 w-4 shrink-0", alarming ? "text-danger" : "text-accent")} />
        <p className="text-sm font-medium text-text-primary">{label}</p>
      </div>
      <p
        className={clsx(
          "mt-2 text-4xl font-semibold font-mono tabular-nums",
          alarming ? "text-danger" : empty ? "text-text-muted" : "text-text-primary"
        )}
      >
        {count}
      </p>
      <p className="mt-1 text-xs text-text-muted">{hint}</p>
    </Link>
  );
}

/** R1/Q4 — AI salomatlik indikatori: LLM jim o'lishi ko'rinadigan hodisa. */
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

const DEPARTMENT_COLUMNS: Column<DepartmentQueueRow>[] = [
  {
    key: "department",
    header: "Bo'lim",
    render: (row) => (
      <Link
        href={`/admin/murojaatlar?department_id=${row.department_id}`}
        className="font-medium text-text-primary hover:text-accent"
      >
        {row.department_name}
      </Link>
    ),
  },
  { key: "new", header: "Yangi", numeric: true, render: (row) => row.new },
  { key: "in_progress", header: "Ijroda", numeric: true, render: (row) => row.in_progress },
  {
    key: "sla_risk",
    header: "SLA xavfi",
    numeric: true,
    render: (row) => <span className={row.sla_risk > 0 ? "text-warning font-medium" : undefined}>{row.sla_risk}</span>,
  },
  {
    key: "overdue",
    header: "Muddati o'tgan",
    numeric: true,
    render: (row) => <span className={row.overdue > 0 ? "text-danger font-semibold" : undefined}>{row.overdue}</span>,
  },
  {
    key: "unowned",
    header: "Egasiz",
    numeric: true,
    render: (row) => <span className={row.unowned > 0 ? "text-warning font-medium" : undefined}>{row.unowned}</span>,
  },
  {
    key: "load",
    header: "Yuklama",
    numeric: true,
    render: (row) =>
      row.wip_limit == null ? (
        <span className="text-text-muted">—</span>
      ) : (
        <span className={row.over_limit ? "text-danger font-semibold" : undefined}>
          {row.over_limit ? `limit ${row.wip_limit} oshgan` : `limit ${row.wip_limit}`}
        </span>
      ),
  },
];

export default function AdminDashboardPage() {
  const [queues, setQueues] = useState<QueueStats | null>(null);
  const [health, setHealth] = useState<AiHealth | null>(null);
  const [recent, setRecent] = useState<ComplaintListItem[]>([]);

  useEffect(() => {
    apiGet<QueueStats>("/api/admin/stats/queues").then(setQueues).catch(() => setQueues(null));
    apiGet<AiHealth>("/api/admin/stats/ai-health").then(setHealth).catch(() => {});
    apiGet<Page<ComplaintListItem>>("/api/admin/complaints?page=1&page_size=6").then((res) => setRecent(res.items));
  }, []);

  return (
    <AppShell title="Bosh ekran" requireRoles={["admin"]}>
      <AiHealthStrip health={health} />

      <div>
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="text-base font-semibold text-text-primary">Hozir nima qilish kerak</h2>
          <p className="text-xs text-text-muted">
            Raqamni bosing — aynan shu ro&apos;yxat ochiladi. Statistika va grafiklar{" "}
            <Link href="/admin/kpi" className="text-accent hover:underline">
              KPI
            </Link>{" "}
            sahifasida.
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 flex-wrap">
          <QueueCard
            label="Biriktirilmagan"
            hint="Bo'limi yoki mas'ul xodimi yo'q"
            value={queues?.unassigned}
            href="/admin/murojaatlar?queue=unassigned"
            icon={ClipboardList}
          />
          <QueueCard
            label="AI istisnolari"
            hint="Past ishonch — nazorat kerak"
            value={queues?.ai_exceptions}
            href="/admin/tasdiqlash"
            icon={SquareCheckBig}
          />
          <QueueCard
            label="SLA xavfi"
            hint="Muddatning 75% i o'tgan"
            value={queues?.sla_risk}
            href="/admin/murojaatlar?queue=sla_risk"
            icon={Clock}
          />
          <QueueCard
            label="Muddati o'tgan"
            hint="Eskalatsiya talab qiladi"
            value={queues?.overdue}
            href="/admin/murojaatlar?queue=overdue"
            icon={AlertTriangle}
            danger
          />
          <QueueCard
            label="Ma'lumot kutilmoqda"
            hint="24 soatdan ko'p javobsiz"
            value={queues?.awaiting_info}
            href="/admin/murojaatlar?queue=need_info"
            icon={MessageCircleQuestion}
          />
        </div>
      </div>

      {(queues?.stuck_ai ?? 0) > 0 && (
        <Card className="border-2 border-danger">
          <div className="flex items-start gap-3">
            <ZapOff className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                AI {queues?.stuck_ai} murojaatga javob bermagan
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Bu murojaatlar bir soatdan ko&apos;p tahlilsiz turgan — LLM ishlamayapti. Tizim qayta urinishda
                davom etadi, lekin kutib o&apos;tirmasdan qo&apos;lda kategoriya va bo&apos;lim qo&apos;yish mumkin.
              </p>
              <Link
                href="/admin/murojaatlar?queue=stuck_ai"
                className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-danger hover:underline"
              >
                Qo&apos;lda yo&apos;naltirish <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-text-primary">Bo&apos;limlar kesimi</h2>
          <p className="text-sm text-text-muted">Qaysi bo&apos;lim qoqilib qolgan — yuk va risk bo&apos;yicha</p>
        </div>
        <Table
          columns={DEPARTMENT_COLUMNS}
          rows={queues?.by_department ?? []}
          rowKey={(row) => row.department_id}
          empty="Bo'limlar hali sozlanmagan"
          onRowClass={(row) => (row.overdue > 0 ? "bg-danger/[0.04]" : undefined)}
        />
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">So&apos;nggi faollik</h2>
          <Link
            href="/admin/murojaatlar"
            className="text-sm text-accent font-medium hover:underline flex items-center gap-1"
          >
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
                    {c.assigned_user_name ?? "egasi yo'q"} · {c.department?.name ?? "biriktirilmagan"}
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
