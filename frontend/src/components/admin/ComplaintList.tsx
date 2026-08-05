"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { AlertTriangle, FileText, Quote, Sparkles, UserX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatUzDateTime } from "@/lib/formatDate";
import type { ComplaintListItem, ComplaintStatus } from "@/lib/types";
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/status";

export function isOverdue(deadline: string | null, status: ComplaintStatus): boolean {
  if (!deadline) return false;
  if (["resolved", "closed", "rejected", "archived"].includes(status)) return false;
  return new Date(deadline).getTime() < Date.now();
}

/**
 * Zich ro'yxat (v1.9) — admin ro'yxatlari uchun YAGONA qator ko'rinishi
 * (kanban olib tashlandi).
 *
 * Kanban `status` bo'yicha 3 ustunga guruhlardi, lekin faqat JORIY
 * SAHIFANI (20 ta yozuv) — shuning uchun raqamlari yolg'on edi va ustunlar
 * amalda doim bo'sh turardi:
 *   - navbatlarda backend terminal statuslarni umuman chiqarib tashlaydi
 *     (`queues.py::_active()`), ya'ni «Yakunlangan» ustuni MATEMATIK
 *     jihatdan to'lmasdi — o'lchov: 20/0/0, 18/0/0, 19/1/0;
 *   - «Barcha murojaatlar» da ham 20/0/0 chiqardi, chunki sahifa eng
 *     yangilaridan boshlanadi va ular hammasi `new` holatida (bazadagi
 *     haqiqiy taqsimot: 96/2/21).
 * Endi bosqich — server filtri (tab), ro'yxat esa hamma joyda bir xil.
 *
 * USTUNLAR SOZLANADI. Bitta qator komponenti — lekin har sahifa o'ziga
 * kerakli ustunni tanlaydi. Sabab: «Navbatim»da `Bo'lim` doim xodimning
 * o'z bo'limi, `Mas'ul` esa doim o'zi yoki «yo'q» — ya'ni har qatorda
 * bir xil qiymat, nol axborot. Aynan shu («kontekstdan qat'i nazar bir
 * xil maydonlar») ilgari navbatlarni bir-biridan farqsiz qilib
 * ko'rsatgan edi.
 */
export type ComplaintColumn = "status" | "priority" | "assignee" | "deadline" | "department";

const COLUMN_SPEC: Record<ComplaintColumn, { label: string; width: string }> = {
  status: { label: "Holat", width: "11rem" },
  priority: { label: "Muhimlik", width: "6rem" },
  assignee: { label: "Mas'ul", width: "minmax(0,1fr)" },
  deadline: { label: "Muddat", width: "8.5rem" },
  department: { label: "Bo'lim", width: "minmax(0,1.2fr)" },
};

const DEFAULT_COLUMNS: ComplaintColumn[] = ["status", "priority", "assignee", "deadline", "department"];

/** Sarlavha va qator AYNAN bir xil shablondan foydalanadi, aks holda
 * ustunlar bir-biriga tegishlashmay qoladi. */
function gridStyle(columns: ComplaintColumn[]): React.CSSProperties {
  return { gridTemplateColumns: `minmax(0,1.6fr) ${columns.map((c) => COLUMN_SPEC[c].width).join(" ")}` };
}

const GRID_CLASS = "xl:grid xl:items-center xl:gap-4";

/** Muddatni «qancha qoldi / qancha kechikdi» ko'rinishida — absolute sana
 * shoshilinchlikni ko'rsatmaydi (xodim boshida ayirma hisoblaydi). */
function relativeDeadline(deadlineAt: string | null, now: number): { label: string; tone: string } {
  if (!deadlineAt) return { label: "Belgilanmagan", tone: "text-text-muted" };
  const diffMs = new Date(deadlineAt).getTime() - now;
  const hours = Math.round(Math.abs(diffMs) / 3_600_000);
  if (diffMs < 0) {
    const label = hours >= 48 ? `${Math.round(hours / 24)} kun kechikdi` : `${hours} soat kechikdi`;
    return { label, tone: "text-danger font-semibold" };
  }
  if (diffMs < 24 * 3_600_000) return { label: `${hours} soat qoldi`, tone: "text-warning" };
  return { label: formatUzDateTime(deadlineAt), tone: "text-text-primary" };
}

function ListHeader({ columns }: { columns: ComplaintColumn[] }) {
  return (
    <div
      className={clsx(
        "hidden border-b border-border bg-bg-subtle py-2.5 pl-6 pr-5 text-[10.5px] font-bold uppercase tracking-widest text-text-muted",
        GRID_CLASS
      )}
      style={gridStyle(columns)}
    >
      <span>Murojaat</span>
      {columns.map((col) => (
        <span key={col}>{COLUMN_SPEC[col].label}</span>
      ))}
    </div>
  );
}

/** Kichik ekranda yorliq + qiymat, xl dan boshlab yorliq sarlavha qatoriga
 * ko'chgani uchun yashiriladi. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-text-muted xl:hidden">{label}</p>
      <div className="mt-0.5 xl:mt-0">{children}</div>
    </div>
  );
}

export function ComplaintRow({
  c,
  columns = DEFAULT_COLUMNS,
  showAiSummary = false,
  now,
  action,
}: {
  c: ComplaintListItem;
  columns?: ComplaintColumn[];
  /** AI xulosasi qator ichida — xodim murojaatni ochmasdan saralashi uchun. */
  showAiSummary?: boolean;
  /** Berilsa muddat nisbiy ko'rsatiladi («3 soat qoldi»). `useNow()` dan
   * keladi; berilmasa absolute sana chiqadi. */
  now?: number;
  /** Qator o'ngidagi harakat (masalan «Qabul qilaman»). Havolaning
   *  ICHIDA emas — `<button>` ni `<a>` ichiga joylash mumkin emas va
   *  bosilganda murojaat ochilib ketardi. */
  action?: React.ReactNode;
}) {
  const overdue = isOverdue(c.deadline_at, c.status);
  const due = now != null ? relativeDeadline(c.deadline_at, now) : null;

  return (
    <div className="group relative flex items-stretch transition-colors hover:bg-bg-subtle">
      {/* Holat relsi — ro'yxatni O'QIMASDAN saralash imkonini beradi.
          `Holat` ustuni allaqachon bor, lekin u o'ngda va matn bilan;
          ko'z esa avval chap qirradan yuguradi. Rang shu yerda takror
          emas, birinchi signal. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: STATUS_COLORS[c.status] }}
      />
      <Link
        href={`/admin/murojaatlar/${c.id}`}
        className={clsx("min-w-0 flex-1 flex flex-col gap-3 py-4 pl-6 pr-5", GRID_CLASS)}
        style={gridStyle(columns)}
      >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-accent-soft transition-colors group-hover:bg-bg-surface">
          <FileText className="h-4 w-4 text-accent" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-text-primary">{c.category.name}</p>
          <p className="font-mono text-xs tabular-nums tracking-wide text-text-muted">{c.ticket_number}</p>
          {/* Navbatda kategoriya nomi yetarli emas: «Hokimlik va kompleks
              masalalar» xodimga hech narsa aytmaydi, holbuki fuqaro
              «maktab oldida katta o'ra, bolalar uchun xavfli» deb yozgan.
              `description_snippet` backenddan doim keladi — u shunchaki
              hech qachon chiqarilmagan. AI xulosasi bo'lsa u ustun,
              chunki u qisqartirilgan; bo'lmasa fuqaroning o'z so'zi. */}
          {showAiSummary && (c.ai?.summary || c.description_snippet) && (
            <p className="mt-1 flex items-start gap-1 text-xs text-text-secondary">
              {c.ai?.summary ? (
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-accent" aria-hidden />
              ) : (
                <Quote className="mt-0.5 h-3 w-3 shrink-0 text-text-muted" aria-hidden />
              )}
              <span className="line-clamp-2">{c.ai?.summary || c.description_snippet}</span>
            </p>
          )}
          {/* Istisno belgisi — ustun emas, chunki kamdan-kam uchraydi. */}
          {c.ai && c.ai.unassigned_services.length > 0 ? (
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-danger">
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
              <span>{`${c.ai.unassigned_services.length} ta xizmat ajratilmagan`}</span>
            </span>
          ) : (
            c.needs_review && (
              <span className="mt-1 inline-flex items-center gap-1 text-xs text-warning">
                <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden /> AI tekshiruv kerak
              </span>
            )
          )}
        </div>
      </div>

      {/* `xl:contents` — bu o'ram xl dan boshlab yo'qoladi va ichidagilar
          qatorning o'z grid ustunlariga aylanadi; kichik ekranda esa
          yorliqli 2 ustunli blok bo'lib qoladi. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:contents">
        {columns.map((col) => (
          <Field key={col} label={COLUMN_SPEC[col].label}>
            {col === "status" && <Badge label={STATUS_LABELS[c.status]} color={STATUS_COLORS[c.status]} />}
            {col === "priority" && <Badge label={PRIORITY_LABELS[c.priority]} color={PRIORITY_COLORS[c.priority]} />}
            {col === "assignee" &&
              (c.assigned_user_name ? (
                <p className="truncate text-sm font-medium text-text-primary">{c.assigned_user_name}</p>
              ) : (
                <p className="flex items-center gap-1 text-sm font-medium text-text-muted">
                  <UserX className="h-3 w-3 shrink-0" aria-hidden /> yo&apos;q
                </p>
              ))}
            {col === "deadline" &&
              (due ? (
                <p className={clsx("truncate text-sm font-medium", due.tone)}>{due.label}</p>
              ) : (
                <p className={clsx("truncate text-sm font-medium", overdue ? "text-danger" : "text-text-primary")}>
                  {c.deadline_at ? formatUzDateTime(c.deadline_at) : "—"}
                </p>
              ))}
            {col === "department" && (
              <p className="truncate text-sm font-medium text-text-primary">{c.department?.name ?? "—"}</p>
            )}
          </Field>
        ))}
      </div>
      </Link>
      {action ? <div className="flex shrink-0 items-center pr-5">{action}</div> : null}
    </div>
  );
}

export function ComplaintRowSkeleton() {
  return (
    <div className="relative flex animate-pulse items-center gap-3 py-4 pl-6 pr-5">
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-border" />
      <span className="h-9 w-9 shrink-0 rounded-[11px] bg-bg-subtle" />
      <span className="h-3.5 flex-1 rounded-full bg-bg-subtle" />
      <span className="hidden h-3.5 w-24 shrink-0 rounded-full bg-bg-subtle xl:block" />
      <span className="hidden h-3.5 w-20 shrink-0 rounded-full bg-bg-subtle xl:block" />
    </div>
  );
}

export function ComplaintList({
  items,
  columns = DEFAULT_COLUMNS,
  showAiSummary,
  now,
  rowAction,
}: {
  items: ComplaintListItem[];
  columns?: ComplaintColumn[];
  showAiSummary?: boolean;
  now?: number;
  /** Har qator uchun harakat tugmasi (ixtiyoriy). */
  rowAction?: (c: ComplaintListItem) => React.ReactNode;
}) {
  return (
    <Card padded={false} className="overflow-hidden">
      <ListHeader columns={columns} />
      <div className="divide-y divide-border">
        {items.map((c) => (
          <ComplaintRow
            key={c.id}
            c={c}
            columns={columns}
            showAiSummary={showAiSummary}
            now={now}
            action={rowAction?.(c)}
          />
        ))}
      </div>
    </Card>
  );
}
