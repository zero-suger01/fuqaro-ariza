"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FilterX, ClipboardList, AlertTriangle, FileSpreadsheet, UserX } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { apiGet, apiGetBlob } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CategoryAdmin, ComplaintListItem, ComplaintStatus, DepartmentAdmin, Page, Priority } from "@/lib/types";
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/status";

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

function AdminComplaintsView() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const queueKey = searchParams.get("queue") ?? "";
  const queue = QUEUES[queueKey];
  const departmentFromUrl = searchParams.get("department_id") ?? "";

  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS, department_id: departmentFromUrl });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page<ComplaintListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryAdmin[]>([]);
  const [departments, setDepartments] = useState<DepartmentAdmin[]>([]);
  const [exporting, setExporting] = useState(false);

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

      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
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
          <div>
            <Label>Sana (dan)</Label>
            <Input type="date" value={filters.date_from} onChange={(e) => update("date_from", e.target.value)} />
          </div>
          <div>
            <Label>Sana (gacha)</Label>
            <Input type="date" value={filters.date_to} onChange={(e) => update("date_to", e.target.value)} />
          </div>
          <div className="col-span-2 sm:col-span-2 lg:col-span-3">
            <Label>Qidiruv</Label>
            <Input value={filters.q} onChange={(e) => update("q", e.target.value)} placeholder="Ticket, telefon yoki matn bo'yicha..." />
          </div>
          <div className="flex items-center gap-4 lg:col-span-2 pb-2.5">
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" checked={filters.overdue} onChange={(e) => update("overdue", e.target.checked)} />
              Muddati o&apos;tgan
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" checked={filters.needs_review} onChange={(e) => update("needs_review", e.target.checked)} />
              AI tekshiruv kerak
            </label>
          </div>
          <div className="lg:col-span-1">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setPage(1);
              }}
            >
              <FilterX className="h-4 w-4" /> Tozalash
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">Murojaatlar ro&apos;yxati</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-muted">
              Jami <strong className="text-text-primary">{total}</strong> ta
            </span>
            {user?.role === "admin" && (
              <Button type="button" variant="secondary" disabled={exporting} onClick={handleExport}>
                <FileSpreadsheet className="h-4 w-4" /> {exporting ? "Tayyorlanmoqda..." : "Excel eksport"}
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-14 text-center text-text-muted text-sm">Yuklanmoqda...</div>
        ) : items.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2 text-text-muted text-sm">
            <ClipboardList className="h-6 w-6" />
            Murojaatlar topilmadi
            <span className="text-xs">Filtrlarni o&apos;zgartirib qayta urinib ko&apos;ring</span>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {items.map((c) => {
              const overdue = isOverdue(c.deadline_at, c.status);
              return (
                <Link
                  key={c.id}
                  href={`/admin/murojaatlar/${c.id}`}
                  className="flex items-center justify-between gap-4 py-3.5 hover:bg-bg-subtle -mx-2 px-2 rounded-inner transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono font-medium text-text-primary">{c.ticket_number}</span>
                      <span className="text-sm text-text-secondary">{c.category.name}</span>
                      {c.needs_review && (
                        <span className="inline-flex items-center gap-1 text-xs text-warning">
                          <AlertTriangle className="h-3 w-3" /> tekshiruv kerak
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      {c.citizen.fullname} · {c.citizen.phone}
                      {c.neighborhood_name ? ` · ${c.neighborhood_name}` : ""}
                      {c.department ? ` · ${c.department.name}` : ""}
                    </p>
                    {/* v1.4: egasi ro'yxatda ko'rinadi — «kim javobgar»
                        savoliga murojaatni ochmasdan javob beradi. */}
                    <p className="text-xs mt-1">
                      {c.assigned_user_name ? (
                        <span className="text-text-secondary">Mas&apos;ul: {c.assigned_user_name}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-warning">
                          <UserX className="h-3 w-3" /> egasi yo&apos;q
                        </span>
                      )}
                    </p>
                    <p className="text-xs mt-1">
                      {new Date(c.created_at).toLocaleDateString("uz-UZ")}
                      {c.deadline_at && (
                        <span className={overdue ? "text-danger font-medium" : "text-text-muted"}>
                          {" "}
                          · muddat: {new Date(c.deadline_at).toLocaleDateString("uz-UZ")}
                          {overdue ? " (o'tgan)" : ""}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge label={PRIORITY_LABELS[c.priority]} color={PRIORITY_COLORS[c.priority]} />
                    <Badge label={STATUS_LABELS[c.status]} color={STATUS_COLORS[c.status]} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
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
      </Card>
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
