"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import {
  FilterX,
  ClipboardList,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Download,
  FileText,
  Search,
  SlidersHorizontal,
  UserX,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { apiGet, apiGetBlob } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatUzDateTime } from "@/lib/formatDate";
import type { CategoryAdmin, ComplaintListItem, ComplaintStatus, DepartmentAdmin, Page, Priority } from "@/lib/types";
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/status";

/** Kanban-uslub ustunlari — 10 ta xom `status`ni operativ jihatdan uchta
 * mantiqiy bosqichga yig'adi (fuqaroga ko'rsatiladigan `status_simple`dan
 * FARQLI — bu yerda admin uchun aniqlik muhim, shuning uchun `accepted`
 * "Ijroda"ga, "assigned" esa hali hech kim qo'l urmagani uchun "Yangi"ga
 * tushadi). Joriy sahifadagi (filtrlangan, paginatsiyalangan) `items`ni
 * qayta guruhlaydi — so'rov/filtr/pagination o'zgarmaydi.
 */
const KANBAN_BUCKETS: {
  key: string;
  label: string;
  dotColor: string;
  emptyHint: string;
  statuses: ComplaintStatus[];
}[] = [
  {
    key: "new",
    label: "Yangi",
    // Ustun nuqtasi ichidagi hukmron holat rangiga mos keladi (STATUS_COLORS)
    // — avval ustun va uning ichidagi kartochka chiplari boshqa-boshqa
    // rangda edi, guruh bilan element bir-biriga bog'lanmasdi.
    dotColor: "var(--st-new)",
    emptyHint: "Yangi murojaatlar shu yerda paydo bo'ladi",
    statuses: ["new", "ai_processed", "assigned"],
  },
  {
    key: "progress",
    label: "Ijroda",
    dotColor: "var(--info)",
    emptyHint: "Ijrodagi murojaatlar shu yerda ko'rinadi",
    statuses: ["accepted", "in_progress", "need_info"],
  },
  {
    key: "done",
    label: "Yakunlangan",
    dotColor: "var(--success)",
    emptyHint: "Yakunlangan murojaatlar shu yerda to'planadi",
    statuses: ["resolved", "closed", "archived", "rejected"],
  },
];

interface Filters {
  status: ComplaintStatus | "";
  category: string;
  department_id: string;
  priority: Priority | "";
  overdue: boolean;
  needs_review: boolean;
  date_from: string;
  date_to: string;
  q: string;
}

const EMPTY_FILTERS: Filters = {
  status: "",
  category: "",
  department_id: "",
  priority: "",
  overdue: false,
  needs_review: false,
  date_from: "",
  date_to: "",
  q: "",
};

const PAGE_SIZE = 20;

/**
 * Bosh ekrandagi navbat kartalari va menyu havolalari `?queue=...` bilan
 * keladi (docs/10 §10.1). Har navbat backendning mos filtriga aylanadi —
 * kartadagi raqam va shu yerdagi ro'yxat soni doim mos keladi, chunki
 * ikkisi ham `services/queues.py` dagi bitta shartdan chiqadi.
 */
const QUEUES: Record<string, { label: string; hint: string; params: Record<string, string> }> = {
  unassigned: {
    label: "Biriktirilmagan",
    hint: "Bo'limi yoki mas'ul xodimi yo'q — dispetcher saralashi kerak",
    params: { unassigned: "true" },
  },
  sla_risk: {
    label: "SLA xavfi",
    hint: "Muddatning 75% i o'tgan, hali kechikmagan",
    params: { sla_risk: "true" },
  },
  overdue: { label: "Muddati o'tgan", hint: "Eskalatsiya talab qiladi", params: { overdue: "true" } },
  need_info: {
    label: "Ma'lumot kutilmoqda",
    hint: "Fuqarodan 24 soatdan ko'p javob kelmagan — follow-up kerak",
    params: { need_info_over_hours: "24" },
  },
  ai: { label: "AI istisnolari", hint: "Past ishonch bilan qaror qilingan", params: { needs_review: "true" } },
  stuck_ai: {
    label: "AI javob bermagan",
    hint: "Bir soatdan ko'p tahlilsiz turgan — qo'lda yo'naltirish kerak",
    params: { stuck_ai: "true" },
  },
  mine: { label: "Mening ishlarim", hint: "Menga biriktirilgan murojaatlar", params: { mine: "true" } },
};

function isOverdue(deadline: string | null, status: ComplaintStatus): boolean {
  if (!deadline) return false;
  if (["resolved", "closed", "rejected", "archived"].includes(status)) return false;
  return new Date(deadline).getTime() < Date.now();
}

function KanbanCard({ c }: { c: ComplaintListItem }) {
  const overdue = isOverdue(c.deadline_at, c.status);
  return (
    <Link
      href={`/admin/murojaatlar/${c.id}`}
      className="group flex flex-col gap-4 rounded-card border border-border bg-bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lift"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg-subtle">
            <FileText className="h-5 w-5 text-text-secondary" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{c.category.name}</p>
            <p className="font-mono text-xs text-text-muted">{c.ticket_number}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge label={STATUS_LABELS[c.status]} color={STATUS_COLORS[c.status]} />
          <ArrowRight
            className="h-3.5 w-3.5 text-text-muted opacity-0 transition-all -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-border pt-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-text-muted">Mas&apos;ul</p>
          {c.assigned_user_name ? (
            <p className="mt-0.5 truncate text-sm font-medium text-text-primary">{c.assigned_user_name}</p>
          ) : (
            /* Muted, `text-warning` emas: egasi yo'qligi 94 ta kartaning
               normal holati, istisno emas. Amber qilinganda u bir kartada
               «Yuqori» muhimlik va muddat ogohlantirishi bilan bir xil
               signal berardi va rostdan shoshilinch narsalar ko'zga
               tashlanmay qolardi. Yo'qlikni UserX ikonasi va «yo'q» so'zi
               allaqachon aytib turibdi; navbat sifatida esa u sidebar
               hisoblagichi va bosh ekran kartasida ko'rinadi. */
            <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-text-muted">
              <UserX className="h-3 w-3 shrink-0" aria-hidden /> yo&apos;q
            </p>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-text-muted">Muddat</p>
          <p className={clsx("mt-0.5 text-sm font-medium", overdue ? "text-danger" : "text-text-primary")}>
            {c.deadline_at ? formatUzDateTime(c.deadline_at) : "—"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-text-muted">Bo&apos;lim</p>
          <p className="mt-0.5 truncate text-sm font-medium text-text-primary">{c.department?.name ?? "—"}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge label={PRIORITY_LABELS[c.priority]} color={PRIORITY_COLORS[c.priority]} />
        {c.needs_review && (
          <span className="inline-flex items-center gap-1 text-xs text-warning">
            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden /> AI tekshiruv kerak
          </span>
        )}
      </div>
    </Link>
  );
}

/** Skeleton — "Yuklanmoqda..." matni o'rniga; yakuniy layout bilan bir xil
 * shaklda, shuning uchun ma'lumot kelganda sakrab qolmaydi. */
function KanbanCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-bg-surface p-5 shadow-card animate-pulse">
      <div className="flex items-center gap-3">
        <span className="h-11 w-11 shrink-0 rounded-full bg-bg-subtle" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="h-3.5 w-2/3 rounded-full bg-bg-subtle" />
          <span className="h-3 w-1/3 rounded-full bg-bg-subtle" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-border pt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <span className="h-2.5 w-10 rounded-full bg-bg-subtle" />
            <span className="h-3.5 w-14 rounded-full bg-bg-subtle" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminComplaintsView() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const queueKey = searchParams.get("queue") ?? "";
  const queue = QUEUES[queueKey];
  const departmentFromUrl = searchParams.get("department_id") ?? "";
  // Topbar'dagi global qidiruv shu sahifaga `?q=...` bilan yo'naltiradi
  // (Topbar.tsx QuickSearch) — filtr paneli buni oldindan to'ldirishi kerak,
  // aks holda foydalanuvchi qidirgan so'zi "yo'qolib" ketardi.
  const qFromUrl = searchParams.get("q") ?? "";

  const [filters, setFilters] = useState<Filters>({
    ...EMPTY_FILTERS,
    department_id: departmentFromUrl,
    q: qFromUrl,
  });
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page<ComplaintListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryAdmin[]>([]);
  const [departments, setDepartments] = useState<DepartmentAdmin[]>([]);
  const [exporting, setExporting] = useState(false);

  // Topbar qidiruvi bu sahifadan-shu-sahifaga (client-side) navigatsiya
  // qiladi — komponent qayta mount bo'lmaydi, shuning uchun yuqoridagi
  // useState boshlang'ich qiymati faqat BIRINCHI yuklanishda ishlaydi.
  // `qFromUrl` o'zgarganda boshqa filtrlarni ham tozalab, faqat shu
  // qidiruvni ko'rsatamiz — aks holda eski filtr izlangan ticketni
  // "yashirib" qo'yishi mumkin edi.
  useEffect(() => {
    if (!qFromUrl) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local filter state to an external source (URL) that changes via client-side nav, not a prop
    setFilters((prev) => (prev.q === qFromUrl ? prev : { ...EMPTY_FILTERS, q: qFromUrl }));
    setPage(1);
  }, [qFromUrl]);

  const filtersActive =
    filters.category ||
    filters.department_id ||
    filters.priority ||
    filters.overdue ||
    filters.needs_review ||
    filters.date_from ||
    filters.date_to;

  useEffect(() => {
    apiGet<CategoryAdmin[]>("/api/admin/categories").then(setCategories).catch(() => setCategories([]));
    if (user?.role === "admin") {
      apiGet<DepartmentAdmin[]>("/api/admin/departments").then(setDepartments).catch(() => setDepartments([]));
    }
  }, [user?.role]);

  function filterParams(): URLSearchParams {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    if (queue) {
      Object.entries(queue.params).forEach(([key, value]) => params.set(key, value));
    }
    return params;
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the fetch below
    setLoading(true);
    const params = filterParams();
    params.set("page", String(page));
    params.set("page_size", String(PAGE_SIZE));
    apiGet<Page<ComplaintListItem>>(`/api/admin/complaints?${params.toString()}`)
      .then(setResult)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterParams reads `filters`/`queueKey`, both deps
  }, [filters, page, queueKey]);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await apiGetBlob(`/api/admin/complaints/export.xlsx?${filterParams().toString()}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "murojaatlar.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const items = result?.items ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppShell title={queue ? queue.label : "Murojaatlar"}>
      {queue && (
        <Card className="border border-accent/40">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-text-primary">Navbat: {queue.label}</p>
              <p className="text-xs text-text-muted mt-0.5">{queue.hint}</p>
            </div>
            <Link
              href="/admin/murojaatlar"
              className="text-sm font-medium text-accent hover:underline shrink-0"
            >
              Barcha murojaatlarga qaytish
            </Link>
          </div>
        </Card>
      )}

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text-primary">Filtrlar</h2>
          {filtersActive ? (
            <button
              type="button"
              onClick={() => {
                setFilters({ ...EMPTY_FILTERS, q: filters.q });
                setPage(1);
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-danger transition-colors"
            >
              <FilterX className="h-3.5 w-3.5" /> Filtrlarni tozalash
            </button>
          ) : (
            <span className="text-xs text-text-muted">Faol filtr yo&apos;q</span>
          )}
        </div>

        {/* Qidiruv — eng ko'p ishlatiladigan amal, shuning uchun eng katta
            va yolg'iz o'z qatorida (docs/10 admin redesign #5). */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={filters.q}
            onChange={(e) => update("q", e.target.value)}
            placeholder="Ticket raqami, telefon yoki murojaat matni bo'yicha qidiring..."
            className="w-full rounded-control border border-border bg-bg-subtle py-3.5 pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-soft"
          />
        </div>

        {/* Birlamchi filtrlar — kunlik triage uchun eng ko'p kerak bo'ladigan
            ikkitasi doim ochiq (#4). */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Holat</Label>
            <Select value={filters.status} onChange={(e) => update("status", e.target.value as ComplaintStatus)}>
              <option value="">Barcha holatlar</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Muhimlik</Label>
            <Select value={filters.priority} onChange={(e) => update("priority", e.target.value as Priority)}>
              <option value="">Barchasi</option>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMoreFilters((v) => !v)}
          className="flex items-center gap-1.5 self-start text-xs font-medium text-text-secondary hover:text-accent transition-colors"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Qo&apos;shimcha filtrlar
          <ChevronDown className={clsx("h-3.5 w-3.5 transition-transform", showMoreFilters && "rotate-180")} />
        </button>

        {/* Ikkilamchi filtrlar — kamroq ishlatiladi, shuning uchun
            standart yopiq (#4: "move secondary filters into a
            collapsible area"). */}
        {showMoreFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 border-t border-border pt-4">
            <div>
              <Label>Kategoriya</Label>
              <Select value={filters.category} onChange={(e) => update("category", e.target.value)}>
                <option value="">Barchasi</option>
                {categories.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.names.uz ?? c.code}
                  </option>
                ))}
              </Select>
            </div>
            {user?.role === "admin" && (
              <div>
                <Label>Bo&apos;lim</Label>
                <Select value={filters.department_id} onChange={(e) => update("department_id", e.target.value)}>
                  <option value="">Barchasi</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.names.uz ?? d.code}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label>Sana (dan)</Label>
              <Input type="date" value={filters.date_from} onChange={(e) => update("date_from", e.target.value)} />
            </div>
            <div>
              <Label>Sana (gacha)</Label>
              <Input type="date" value={filters.date_to} onChange={(e) => update("date_to", e.target.value)} />
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-4 flex items-center gap-5">
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" checked={filters.overdue} onChange={(e) => update("overdue", e.target.checked)} />
                Muddati o&apos;tgan
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={filters.needs_review}
                  onChange={(e) => update("needs_review", e.target.checked)}
                />
                AI tekshiruv kerak
              </label>
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
          Murojaatlar ro&apos;yxati
          <span className="text-sm font-normal text-text-muted">· {total} ta</span>
        </h2>
        {/* Eksport — yordamchi amal, triage'dan ustun turmasligi kerak
            (#22: "export should feel secondary, not the hero"). */}
        {user?.role === "admin" && (
          <button
            type="button"
            disabled={exporting}
            onClick={handleExport}
            className="flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-accent transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> {exporting ? "Tayyorlanmoqda..." : "Excel eksport"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {KANBAN_BUCKETS.map((bucket) => (
            <div key={bucket.key} className="flex flex-col gap-3">
              <div className="h-4 w-24 rounded-full bg-bg-subtle animate-pulse" />
              <KanbanCardSkeleton />
              <KanbanCardSkeleton />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <div className="py-14 flex flex-col items-center gap-2 text-text-muted text-sm">
            <ClipboardList className="h-6 w-6" />
            Murojaatlar topilmadi
            <span className="text-xs">Filtrlarni o&apos;zgartirib qayta urinib ko&apos;ring</span>
          </div>
        </Card>
      ) : (
        // Joriy sahifa (server filtr/pagination'idan kelgan `items`) 3 ta
        // operativ ustunga guruhlanadi — pagination o'sha holicha ishlaydi,
        // faqat ko'rinish o'zgaradi (kanban, docs/10 dan tashqari — pilot).
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {KANBAN_BUCKETS.map((bucket) => {
            const bucketItems = items.filter((c) => bucket.statuses.includes(c.status));
            return (
              <div key={bucket.key} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 rounded-control bg-bg-subtle px-3 py-2.5">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: bucket.dotColor }} />
                  <h3 className="text-sm font-semibold text-text-primary">{bucket.label}</h3>
                  <span className="ml-auto rounded-pill bg-bg-surface px-2 py-0.5 text-xs font-mono font-semibold tabular-nums text-text-secondary">
                    {bucketItems.length}
                  </span>
                </div>
                {bucketItems.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border-strong p-8 text-center">
                    <ClipboardList className="h-5 w-5 text-text-muted" aria-hidden />
                    <p className="text-xs text-text-muted">{bucket.emptyHint}</p>
                  </div>
                ) : (
                  bucketItems.map((c) => <KanbanCard key={c.id} c={c} />)
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-card border border-border bg-bg-surface px-5 py-4 shadow-card">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Oldingi
          </Button>
          <span className="text-sm text-text-muted">
            {page} / {totalPages}
          </span>
          <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Keyingi
          </Button>
        </div>
      )}
    </AppShell>
  );
}

/**
 * `useSearchParams()` Suspense chegarasini talab qiladi (Next.js 16 —
 * prerender paytida u null qaytaradi va build ogohlantiradi).
 */
export default function AdminComplaintsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-muted">Yuklanmoqda...</div>}>
      <AdminComplaintsView />
    </Suspense>
  );
}
