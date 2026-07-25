"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Inbox, Clock3, MessageCircleQuestion, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useNow } from "@/lib/useNow";
import { formatUzDateTime, formatUzDayLong } from "@/lib/formatDate";
import type { ComplaintListItem, Page } from "@/lib/types";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/status";

/** R2/Q3 — «Navbatim»: xodim login qilganda jadval emas, ISH NAVBATI kutib
 * oladi. Uch guruh, deadline bo'yicha saralangan, har qatorda AI xulosasi.
 * Texnik: mavjud /api/admin/complaints (bo'lim filtri backend'da avtomatik) —
 * bitta so'rov, guruhlash clientda. */

const ACTIVE_STATUSES = ["assigned", "accepted", "in_progress", "need_info"] as const;

function deadlineInfo(deadlineAt: string | null, now: number): { label: string; overdue: boolean; soon: boolean } {
  if (!deadlineAt) return { label: "Muddat belgilanmagan", overdue: false, soon: false };
  const deadline = new Date(deadlineAt);
  const diffMs = deadline.getTime() - now;
  const hours = Math.round(Math.abs(diffMs) / 3_600_000);
  if (diffMs < 0) return { label: `Muddat o'tdi: ${hours} soat`, overdue: true, soon: false };
  if (diffMs < 24 * 3_600_000) return { label: `Muddatgacha ${hours} soat`, overdue: false, soon: true };
  return { label: `Muddat: ${formatUzDateTime(deadlineAt)}`, overdue: false, soon: false };
}

function QueueItem({ c, now }: { c: ComplaintListItem; now: number }) {
  const due = deadlineInfo(c.deadline_at, now);
  return (
    <Link
      href={`/admin/murojaatlar/${c.id}`}
      className="block rounded-inner border border-border bg-bg-surface px-4 py-3 hover:border-accent transition"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-mono text-text-muted">{c.ticket_number}</span>
        <Badge label={PRIORITY_LABELS[c.priority]} color={PRIORITY_COLORS[c.priority]} />
      </div>
      <p className="text-sm font-medium text-text-primary truncate">{c.category.name}</p>
      {c.ai?.summary && (
        <p className="text-xs text-text-secondary mt-1 line-clamp-2 flex items-start gap-1">
          <Sparkles className="h-3 w-3 text-accent mt-0.5 shrink-0" />
          <span>{c.ai.summary}</span>
        </p>
      )}
      <p className={`text-xs mt-1.5 ${due.overdue ? "text-danger font-semibold" : due.soon ? "text-warning font-medium" : "text-text-muted"}`}>
        {due.label}
      </p>
    </Link>
  );
}

function QueueColumn({
  title,
  icon: Icon,
  items,
  countColor,
  empty,
  now,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: ComplaintListItem[];
  countColor: "gold" | "red" | "grey";
  empty: string;
  now: number;
}) {
  const colors = {
    gold: "bg-accent-soft text-accent",
    red: "bg-danger/10 text-danger",
    grey: "bg-bg-subtle text-text-muted",
  } as const;
  return (
    <Card className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">{title}</h2>
        </div>
        <span className={`text-xs font-mono font-bold rounded-pill px-2 py-0.5 ${colors[countColor]}`}>
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <p className="text-sm text-text-muted py-6 text-center">{empty}</p>
        ) : (
          items.map((c) => <QueueItem key={c.id} c={c} now={now} />)
        )}
      </div>
    </Card>
  );
}

export default function NavbatimPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ComplaintListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const now = useNow();

  useEffect(() => {
    // Bitta so'rov: barcha faol statuslar (bo'lim cheklovi backendda), keyin
    // clientda guruhlash — 100 tagacha faol ish bitta bo'lim uchun yetarli.
    apiGet<Page<ComplaintListItem>>("/api/admin/complaints?page=1&page_size=100")
      .then((res) => setItems(res.items.filter((c) => (ACTIVE_STATUSES as readonly string[]).includes(c.status))))
      .finally(() => setLoading(false));
  }, []);

  const byDeadline = (a: ComplaintListItem, b: ComplaintListItem) => {
    if (!a.deadline_at) return 1;
    if (!b.deadline_at) return -1;
    return new Date(a.deadline_at).getTime() - new Date(b.deadline_at).getTime();
  };

  const fresh = useMemo(
    () => items.filter((c) => c.status === "assigned" || c.status === "accepted").sort(byDeadline),
    [items]
  );
  const inWork = useMemo(() => items.filter((c) => c.status === "in_progress").sort(byDeadline), [items]);
  const waiting = useMemo(() => items.filter((c) => c.status === "need_info").sort(byDeadline), [items]);
  const isOverdue = (c: ComplaintListItem) => !!c.deadline_at && new Date(c.deadline_at).getTime() < now;
  const overdueCount = now === 0 ? 0 : items.filter(isOverdue).length;

  const today = now === 0 ? "" : formatUzDayLong(now);

  return (
    <AppShell title="Navbatim">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <p className="text-sm text-text-secondary">
          {today}
          {user?.department_name ? ` · ${user.department_name}` : ""}
        </p>
        <p className="text-sm text-text-muted">
          {fresh.length} yangi ish
          {overdueCount > 0 && <span className="text-danger font-semibold"> · {overdueCount} ta muddati o&apos;tgan</span>}
        </p>
      </div>

      {loading ? (
        <div className="py-10 text-center text-text-muted text-sm">Yuklanmoqda...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <QueueColumn
            title="Yangi biriktirilgan"
            icon={Inbox}
            items={fresh}
            countColor="gold"
            empty="Yangi ish yo'q — barakalla!"
            now={now}
          />
          <QueueColumn
            title="Ijrodagi ishlarim"
            icon={Clock3}
            items={inWork}
            countColor={inWork.some(isOverdue) ? "red" : "grey"}
            empty="Ijroda ish yo'q"
            now={now}
          />
          <QueueColumn
            title="Ma'lumot kutilmoqda"
            icon={MessageCircleQuestion}
            items={waiting}
            countColor="grey"
            empty="Kutilayotgan javob yo'q"
            now={now}
          />
        </div>
      )}

      <p className="text-xs text-text-muted">
        Murojaatni ochsangiz — AI tayyorlagan javob bilan birga ochiladi; «Bo&apos;lim qabul qildi» belgisi avtomatik
        qo&apos;yiladi. To&apos;liq ro&apos;yxat va filtrlar:{" "}
        <Link href="/admin/murojaatlar" className="text-accent hover:underline">
          Murojaatlar
        </Link>
      </p>
    </AppShell>
  );
}
