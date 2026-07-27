"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import {
  FilterX,
  ClipboardList,
  AlertTriangle,
  ChevronDown,
  Download,
  FileText,
  Search,
  SlidersHorizontal,
  UserX,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { apiGet, apiGetBlob } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatUzDateTime } from "@/lib/formatDate";
import type {
  CategoryAdmin,
  ComplaintListItem,
  ComplaintStatus,
  DepartmentAdmin,
  Page,
  Priority,
  StageCounts,
} from "@/lib/types";
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/status";

/**
 * Bosqich tablari (v1.9) — 10 ta xom `status` xodim uchun uchta bosqichga
 * yig'iladi. Xarita SERVERDA (`app/core/constants.py::STAGES`), bu yerda
 * faqat yorliq va rang: ro'yxat ham, tabdagi son ham o'sha yagona
 * ta'rifdan chiqadi.
 *
 * Avval bu guruhlash faqat UI ichida (kanban ustunlari) edi va JORIY
 * SAHIFANING 20 ta yozuvini qayta guruhlardi — natijada ustun raqamlari
 * yolg'on chiqardi: bazada 96/2/21 bo'lgani holda ekranda «20/0/0»
 * turardi. Endi tab serverga `?stage=` yuboradi, son esa
 * `/complaints/stage-counts` dan keladi.
 */
const STAGE_TABS: { key: string; label: string; dotColor: string | null }[] = [
  // Bo'sh kalit = filtrsiz. Kanban uchala guruhni birdaniga ko'rsatardi,
  // shuning uchun «Hammasi» tabi SHART — usiz «barchasini ko'rish»
  // imkoniyati yo'qolardi.
  { key: "", label: "Hammasi", dotColor: null },
  { key: "new", label: "Yangi", dotColor: "var(--st-new)" },
  { key: "progress", label: "Ijroda", dotColor: "var(--info)" },
  { key: "done", label: "Yakunlangan", dotColor: "var(--success)" },
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
    label: "Muddat tugayapti",
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

/**
 * Zich ro'yxat (v1.9) — sahifadagi YAGONA ko'rinish (kanban olib tashlandi).
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
 * Bitta grid shabloni — sarlavha va qator uchun AYNAN bir xil, aks holda
 * ustunlar bir-biriga tegishlashmay qoladi.
 */
const LIST_GRID =
  "xl:grid xl:grid-cols-[minmax(0,1.6fr)_11rem_6rem_minmax(0,1fr)_8.5rem_minmax(0,1.2fr)] xl:items-center xl:gap-4";

function ListHeader() {
  return (
    <div
      className={clsx(
        "hidden border-b border-border bg-bg-subtle px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted",
        LIST_GRID
      )}
    >
      <span>Murojaat</span>
      <span>Holat</span>
      <span>Muhimlik</span>
      <span>Mas&apos;ul</span>
      <span>Muddat</span>
      <span>Bo&apos;lim</span>
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

function ComplaintRow({ c }: { c: ComplaintListItem }) {
  const overdue = isOverdue(c.deadline_at, c.status);
  return (
    <Link
      href={`/admin/murojaatlar/${c.id}`}
      className={clsx("group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-bg-subtle", LIST_GRID)}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-subtle transition-colors group-hover:bg-bg-surface">
          <FileText className="h-4 w-4 text-text-secondary" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">{c.category.name}</p>
          <p className="font-mono text-xs text-text-muted">{c.ticket_number}</p>
          {/* Istisno belgisi — ustun emas, chunki kamdan-kam uchraydi
              (kanban kartasidagi bilan bir xil mantiq). */}
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
        <Field label="Holat">
          <Badge label={STATUS_LABELS[c.status]} color={STATUS_COLORS[c.status]} />
        </Field>
        <Field label="Muhimlik">
          <Badge label={PRIORITY_LABELS[c.priority]} color={PRIORITY_COLORS[c.priority]} />
        </Field>
        <Field label="Mas'ul">
          {c.assigned_user_name ? (
            <p className="truncate text-sm font-medium text-text-primary">{c.assigned_user_name}</p>
          ) : (
            <p className="flex items-center gap-1 text-sm font-medium text-text-muted">
              <UserX className="h-3 w-3 shrink-0" aria-hidden /> yo&apos;q
            </p>
          )}
        </Field>
        <Field label="Muddat">
          <p className={clsx("truncate text-sm font-medium", overdue ? "text-danger" : "text-text-primary")}>
            {c.deadline_at ? formatUzDateTime(c.deadline_at) : "—"}
          </p>
        </Field>
        <Field label="Bo'lim">
          <p className="truncate text-sm font-medium text-text-primary">{c.department?.name ?? "—"}</p>
        </Field>
      </div>
    </Link>
  );
}

function ComplaintRowSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 px-5 py-4">
      <span className="h-9 w-9 shrink-0 rounded-full bg-bg-subtle" />
      <span className="h-3.5 flex-1 rounded-full bg-bg-subtle" />
      <span className="hidden h-3.5 w-24 shrink-0 rounded-full bg-bg-subtle xl:block" />
      <span className="hidden h-3.5 w-20 shrink-0 rounded-full bg-bg-subtle xl:block" />
    </div>
  );
}

function ComplaintList({ items }: { items: ComplaintListItem[] }) {
  return (
    <Card padded={false} className="overflow-hidden">
      <ListHeader />
      <div className="divide-y divide-border">
        {items.map((c) => (
          <ComplaintRow key={c.id} c={c} />
        ))}
      </div>
    </Card>
  );
}

/**
 * Bosqich tablari.
 *
 * Suriladigan ko'rsatkich SOF CSS bilan: `sm` dan boshlab tablar teng
 * kenglikda (`grid-cols-4`), shuning uchun indikatorni o'z kengligiga
 * `translateX(i * 100%)` qilib surish yetarli — DOM o'lchash, ref va
 * effekt kerak emas (o'lcha-keyin-setState naqshi `useEffect` ichida
 * setState talab qilardi, bu esa taqiqlangan).
 *
 * 375px da esa 4 ta teng ustunga «Yakunlangan» sig'maydi (o'lchandi —
 * qirqilardi), shuning uchun mobil ko'rinish gorizontal siljiydigan
 * qatorga o'tadi: yorliqlar to'liq o'qiladi, faol tab esa indikator
 * o'rniga o'z foni bilan ajralib turadi.
 */
function StageTabs({
  value,
  counts,
  onChange,
}: {
  value: string;
  counts: StageCounts | null;
  onChange: (stage: string) => void;
}) {
  const index = Math.max(
    0,
    STAGE_TABS.findIndex((t) => t.key === value)
  );
  const totalAll = counts ? counts.new + counts.progress + counts.done : null;

  return (
    <div
      role="tablist"
      aria-label="Bosqich"
      className="no-scrollbar relative flex gap-1 overflow-x-auto rounded-pill bg-bg-subtle p-1 sm:grid sm:grid-cols-4 sm:gap-0 sm:overflow-visible"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-1 left-1 hidden rounded-pill bg-bg-surface shadow-card transition-transform duration-300 ease-out motion-reduce:transition-none sm:block"
        style={{ width: "calc((100% - 0.5rem) / 4)", transform: `translateX(${index * 100}%)` }}
      />
      {STAGE_TABS.map((tab) => {
        const active = tab.key === value;
        const count = counts
          ? tab.key === ""
            ? totalAll
            : counts[tab.key as keyof StageCounts]
          : null;
        return (
          <button
            key={tab.key || "all"}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={clsx(
              "relative z-10 flex shrink-0 items-center justify-center gap-1.5 rounded-pill px-3 py-2 text-[13px] transition-colors sm:min-w-0 sm:shrink sm:gap-2",
              active
                ? // Mobilda indikator yo'q (siljiydigan qator) — faol tab
                  // o'z foni bilan ajraladi; sm dan boshlab foni indikatorga
                  // o'tadi, aks holda ikkitasi ustma-ust tushardi.
                  "bg-bg-surface font-semibold text-text-primary shadow-card sm:bg-transparent sm:shadow-none"
                : "font-medium text-text-muted hover:text-text-secondary"
            )}
          >
            {tab.dotColor && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: tab.dotColor }}
                aria-hidden
              />
            )}
            <span className="sm:truncate">{tab.label}</span>
            {/* Kichik ekranda son yashiriladi — u yerda joy siljish bilan
                yechilgan, son esa qatorni keraksiz uzaytirardi. */}
            {count !== null && (
              <span
                className={clsx(
                  "hidden shrink-0 rounded-pill px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums sm:inline",
                  active ? "bg-bg-subtle text-text-secondary" : "text-text-muted"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Ixcham filtr paneli (v1.9).
 *
 * Avval bu joyda doim ochiq katta karta turardi — qidiruv + 2 ta select +
 * ochilma blok, ~250px, ya'ni kontent maydonining ~30% i, va u TO'RTTALA
 * navbat ko'rinishida bir xil takrorlanardi. Holbuki navbatning o'zi
 * allaqachon filtr: kunlik ishda bu panel deyarli har doim tegilmasdan
 * turardi.
 *
 * Endi: bitta qator (qidiruv + tugma), faol filtrlar esa o'chiriladigan
 * chip bo'lib ko'rinadi — nima yoqilganini panelni ochmasdan bilish
 * mumkin. Qolgan maydonlar tugma ostidagi popoverda.
 */
function FilterBar({
  filters,
  activeChips,
  onChange,
  onClearOne,
  onClearAll,
  categories,
  departments,
  isAdmin,
}: {
  filters: Filters;
  activeChips: { key: keyof Filters; label: string }[];
  onChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onClearOne: (key: keyof Filters) => void;
  onClearAll: () => void;
  categories: CategoryAdmin[];
  departments: DepartmentAdmin[];
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={filters.q}
            onChange={(e) => onChange("q", e.target.value)}
            placeholder="Ticket, telefon yoki matn bo'yicha qidiring..."
            className="w-full rounded-pill border border-border bg-bg-subtle py-2.5 pl-10 pr-4 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-soft"
          />
        </div>

        <div className="relative shrink-0" ref={wrapRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={clsx(
              "flex h-11 items-center gap-2 rounded-pill border px-3.5 text-sm font-medium transition-colors sm:px-4",
              activeChips.length > 0
                ? "border-accent/40 bg-accent-soft text-accent"
                : "border-border bg-bg-subtle text-text-secondary hover:text-text-primary"
            )}
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Filtrlar</span>
            {activeChips.length > 0 && (
              <span className="rounded-pill bg-accent px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-accent-contrast">
                {activeChips.length}
              </span>
            )}
            <ChevronDown
              className={clsx("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")}
              aria-hidden
            />
          </button>

          {open && (
            <div className="absolute right-0 top-[3.25rem] z-30 w-[min(22rem,calc(100vw-2rem))] rounded-card border border-border bg-bg-surface p-4 shadow-lift">
              <div className="flex flex-col gap-3">
                <div>
                  <Label>Holat</Label>
                  <Select
                    value={filters.status}
                    onChange={(e) => onChange("status", e.target.value as ComplaintStatus)}
                  >
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
                  <Select
                    value={filters.priority}
                    onChange={(e) => onChange("priority", e.target.value as Priority)}
                  >
                    <option value="">Barchasi</option>
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Kategoriya</Label>
                  <Select value={filters.category} onChange={(e) => onChange("category", e.target.value)}>
                    <option value="">Barchasi</option>
                    {categories.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.names.uz ?? c.code}
                      </option>
                    ))}
                  </Select>
                </div>
                {isAdmin && (
                  <div>
                    <Label>Bo&apos;lim</Label>
                    <Select
                      value={filters.department_id}
                      onChange={(e) => onChange("department_id", e.target.value)}
                    >
                      <option value="">Barchasi</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.names.uz ?? d.code}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Sana (dan)</Label>
                    <Input
                      type="date"
                      value={filters.date_from}
                      onChange={(e) => onChange("date_from", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Sana (gacha)</Label>
                    <Input
                      type="date"
                      value={filters.date_to}
                      onChange={(e) => onChange("date_to", e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={filters.overdue}
                      onChange={(e) => onChange("overdue", e.target.checked)}
                    />
                    Muddati o&apos;tgan
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={filters.needs_review}
                      onChange={(e) => onChange("needs_review", e.target.checked)}
                    />
                    AI tekshiruv kerak
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onClearOne(chip.key)}
              className="group flex items-center gap-1.5 rounded-pill border border-border bg-bg-subtle py-1 pl-3 pr-2 text-xs font-medium text-text-secondary transition-colors hover:border-danger/40 hover:text-danger"
              aria-label={`${chip.label} filtrini olib tashlash`}
            >
              {chip.label}
              <X className="h-3 w-3 shrink-0 text-text-muted transition-colors group-hover:text-danger" aria-hidden />
            </button>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="flex items-center gap-1 px-1.5 py-1 text-xs font-medium text-text-muted transition-colors hover:text-danger"
          >
            <FilterX className="h-3.5 w-3.5" aria-hidden /> Tozalash
          </button>
        </div>
      )}
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

  // Bosqich URL'da — sahifa yangilanganda yoki havola ulashilganda tab
  // saqlanib qolishi kerak (`?queue=` bilan bir xil yondashuv).
  const stage = searchParams.get("stage") ?? "";
  const router = useRouter();

  const [filters, setFilters] = useState<Filters>({
    ...EMPTY_FILTERS,
    department_id: departmentFromUrl,
    q: qFromUrl,
  });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page<ComplaintListItem> | null>(null);
  const [stageCounts, setStageCounts] = useState<StageCounts | null>(null);
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

  // Chiplar — qaysi filtr yoqilganini panelni ochmasdan ko'rsatadi.
  // `q` bu yerda yo'q: u qidiruv qutisining o'zida ko'rinib turibdi.
  const activeChips: { key: keyof Filters; label: string }[] = [];
  if (filters.status) activeChips.push({ key: "status", label: `Holat: ${STATUS_LABELS[filters.status]}` });
  if (filters.priority)
    activeChips.push({ key: "priority", label: `Muhimlik: ${PRIORITY_LABELS[filters.priority]}` });
  if (filters.category) {
    const name = categories.find((c) => c.code === filters.category)?.names.uz ?? filters.category;
    activeChips.push({ key: "category", label: `Kategoriya: ${name}` });
  }
  if (filters.department_id) {
    const name = departments.find((d) => d.id === filters.department_id)?.names.uz ?? "tanlangan";
    activeChips.push({ key: "department_id", label: `Bo'lim: ${name}` });
  }
  if (filters.date_from) activeChips.push({ key: "date_from", label: `Sanadan: ${filters.date_from}` });
  if (filters.date_to) activeChips.push({ key: "date_to", label: `Sanagacha: ${filters.date_to}` });
  if (filters.overdue) activeChips.push({ key: "overdue", label: "Muddati o'tgan" });
  if (filters.needs_review) activeChips.push({ key: "needs_review", label: "AI tekshiruv kerak" });

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
    if (stage) params.set("stage", stage);
    params.set("page", String(page));
    params.set("page_size", String(PAGE_SIZE));
    apiGet<Page<ComplaintListItem>>(`/api/admin/complaints?${params.toString()}`)
      .then(setResult)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterParams reads `filters`/`queueKey`, both deps
  }, [filters, page, queueKey, stage]);

  // Tab sonlari — `stage`SIZ, aks holda har tab o'z sonini o'zi filtrlab
  // tashlardi. Tab almashganda qayta so'ralmaydi (sonlar o'zgarmaydi).
  useEffect(() => {
    apiGet<StageCounts>(`/api/admin/complaints/stage-counts?${filterParams().toString()}`)
      .then(setStageCounts)
      .catch(() => setStageCounts(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterParams reads `filters`/`queueKey`, both deps
  }, [filters, queueKey]);

  function setStage(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("stage", next);
    else params.delete("stage");
    router.replace(`/admin/murojaatlar?${params.toString()}`, { scroll: false });
    setPage(1);
  }

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
    // Aniq holat tanlangani — bosqichning aniqroq ko'rinishi, ya'ni ikkalasi
    // BIR o'lchov. Birga qoldirilsa zid juftlik hosil bo'lardi (masalan
    // «Yakunlangan» tabi + «Qabul qilindi» holati) va foydalanuvchi sababi
    // ko'rinmaydigan bo'sh ro'yxatga qarab qolardi.
    if (key === "status" && value) setStage("");
  }

  function clearFilter(key: keyof Filters) {
    setFilters((prev) => ({ ...prev, [key]: typeof prev[key] === "boolean" ? false : "" }));
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

      {/* Tab + filtr bitta idishda: tab — navigatsiya (birlamchi), filtr —
          aniqlashtirish (ikkilamchi). Avval bu joyda faqat doim ochiq
          ~250px lik filtr kartasi turardi. */}
      <Card padded={false}>
        {/* Navbatda tab ko'rsatilmaydi: navbat filtrlari terminal
            statuslarni allaqachon chiqarib tashlaydi, ya'ni «Yakunlangan»
            tabi doim 0 bo'lardi (LIST_GRID izohi). */}
        {!queue && (
          <div className="border-b border-border px-4 py-3">
            <StageTabs value={stage} counts={stageCounts} onChange={setStage} />
          </div>
        )}
        <div className="px-4 py-3">
          <FilterBar
            filters={filters}
            activeChips={activeChips}
            onChange={update}
            onClearOne={clearFilter}
            onClearAll={() => {
              setFilters({ ...EMPTY_FILTERS, q: filters.q });
              setPage(1);
            }}
            categories={categories}
            departments={departments}
            isAdmin={user?.role === "admin"}
          />
        </div>
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
        <Card padded={false} className="overflow-hidden">
          <div className="divide-y divide-border">
            {[0, 1, 2, 3, 4].map((i) => (
              <ComplaintRowSkeleton key={i} />
            ))}
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <div className="py-14 flex flex-col items-center gap-2 text-text-muted text-sm">
            <ClipboardList className="h-6 w-6" />
            Murojaatlar topilmadi
            <span className="text-xs">Filtrlarni o&apos;zgartirib qayta urinib ko&apos;ring</span>
          </div>
        </Card>
      ) : (
        <ComplaintList items={items} />
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
