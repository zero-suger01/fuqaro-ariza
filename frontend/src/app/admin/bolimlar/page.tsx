"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Briefcase,
  Building2,
  Bus,
  Construction,
  Droplets,
  FileText,
  Flame,
  GraduationCap,
  HardHat,
  HeartHandshake,
  HeartPulse,
  Landmark,
  Leaf,
  type LucideIcon,
  Map,
  Home as HomeIcon,
  Plus,
  Receipt,
  Scale,
  ShieldAlert,
  Siren,
  Trash2,
  TreePine,
  Wheat,
  Wifi,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import type { DepartmentAdmin } from "@/lib/types";

const EMPTY_FORM = { code: "", name_uz: "", phone: "", email: "", is_external: true };

// Tashkilot nomiga mos ikonka (mijoz so'ragan: hammasida bitta ikonka
// o'rniga farqli, ma'noga mos belgi). `department.code` bo'yicha —
// backend seed'dagi haqiqiy kodlar (app/models/department.py orqali
// tekshirilgan). Ro'yxatda yo'q yangi kod uchun `Building2` zaxira bo'lib
// qoladi (default: umumiy idora belgisi).
const DEPARTMENT_ICONS: Record<string, LucideIcon> = {
  bandlik: Briefcase,
  ekologiya: Leaf,
  elektr: Zap,
  favqulodda: Siren,
  fhdyo: FileText,
  gaz: Flame,
  hokimlik: Landmark,
  huquq: Scale,
  iib: ShieldAlert,
  ijtimoiy: HeartHandshake,
  kadastr: Map,
  kommunal: HomeIcon,
  obodonlashtirish: TreePine,
  qishloq_xojaligi: Wheat,
  qurilish: HardHat,
  sanitariya: Trash2,
  sogliqni_saqlash: HeartPulse,
  soliq: Receipt,
  suvsoz: Droplets,
  talim: GraduationCap,
  telekom: Wifi,
  transport: Bus,
  yolxojaligi: Construction,
};

function departmentIcon(code: string): LucideIcon {
  return DEPARTMENT_ICONS[code] ?? Building2;
}

function DepartmentsView() {
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("q") ?? "").trim().toLowerCase();

  const [departments, setDepartments] = useState<DepartmentAdmin[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiGet<DepartmentAdmin[]>("/api/admin/departments").then(setDepartments);
  }

  useEffect(load, []);

  // Topbar qidiruvi (mijoz so'ragan) — nom/kod bo'yicha mahalliy filtr.
  const visibleDepartments = useMemo(() => {
    if (!searchQuery) return departments;
    return departments.filter((d) =>
      [d.names.uz, d.code].filter(Boolean).some((f) => f!.toLowerCase().includes(searchQuery))
    );
  }, [departments, searchQuery]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/admin/departments", {
        code: form.code,
        names: { uz: form.name_uz },
        phone: form.phone || null,
        email: form.email || null,
        is_external: form.is_external,
        is_active: true,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(dept: DepartmentAdmin) {
    await apiPatch(`/api/admin/departments/${dept.id}`, { is_active: !dept.is_active });
    load();
  }

  /** v1.4 — yuklama limiti. Bloklamaydi: bosh ekrandagi bo'limlar
   *  jadvalida «limit oshgan» deb belgilanadi (docs/10 §10.1). */
  async function saveWipLimit(dept: DepartmentAdmin, raw: string) {
    const trimmed = raw.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next !== null && (!Number.isInteger(next) || next < 0)) return;
    if (next === dept.wip_limit) return;
    await apiPatch(`/api/admin/departments/${dept.id}`, { wip_limit: next });
    load();
  }

  return (
    <AppShell title="Bo'limlar" requireRoles={["district_admin", "system_admin"]}>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">Bo&apos;lim va tashkilotlar</h2>
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> Yangi bo&apos;lim
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 pb-6 border-b border-border">
            <div>
              <Label>Kod</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required placeholder="masalan: suvsoz" />
            </div>
            <div>
              <Label>Nomi (uz)</Label>
              <Input value={form.name_uz} onChange={(e) => setForm((f) => ({ ...f, name_uz: e.target.value }))} required />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm text-text-secondary sm:col-span-2">
              <input
                type="checkbox"
                checked={form.is_external}
                onChange={(e) => setForm((f) => ({ ...f, is_external: e.target.checked }))}
              />
              Tashqi tashkilot (ichki bo&apos;lim bo&apos;lsa belgilamang)
            </label>
            {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                Saqlash
              </Button>
            </div>
          </form>
        )}

        {departments.length === 0 ? (
          <div className="py-14 text-center text-text-muted text-sm">Bo&apos;limlar topilmadi</div>
        ) : visibleDepartments.length === 0 ? (
          <div className="py-14 text-center text-text-muted text-sm">Qidiruvga mos bo&apos;lim topilmadi</div>
        ) : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleDepartments.map((dept) => {
              const DeptIcon = departmentIcon(dept.code);
              return (
              <div key={dept.id} className="flex items-center gap-3 rounded-inner border border-border px-4 py-3">
                <div className="h-10 w-10 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
                  <DeptIcon className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{dept.names.uz ?? dept.code}</p>
                  <p className="text-xs text-text-muted">
                    {dept.code} · {dept.is_external ? "Tashqi" : "Ichki"}
                    {!dept.is_active && " · nofaol"}
                  </p>
                </div>
                <label className="shrink-0 text-xs text-text-muted flex items-center gap-1.5">
                  Yuklama limiti
                  <input
                    type="number"
                    min={0}
                    defaultValue={dept.wip_limit ?? ""}
                    onBlur={(e) => saveWipLimit(dept, e.target.value)}
                    placeholder="—"
                    aria-label={`${dept.names.uz ?? dept.code} yuklama limiti`}
                    className="w-16 rounded-control border border-border bg-bg-surface px-2 py-1 text-sm text-text-primary outline-none focus:border-accent"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => toggleActive(dept)}
                  className={
                    dept.is_active
                      ? "flex items-center gap-1 text-xs text-danger hover:underline shrink-0"
                      : "text-xs text-accent hover:underline shrink-0"
                  }
                >
                  {dept.is_active ? (
                    <>
                      <Trash2 className="h-3 w-3" /> O&apos;chirish
                    </>
                  ) : (
                    "Yoqish"
                  )}
                </button>
              </div>
              );
            })}
          </div>
          <p className="text-xs text-text-muted mt-4">
            Yuklama limiti — bo&apos;lim bir vaqtda qulay olib bora oladigan aktiv ish soni. U hech narsani{" "}
            <strong>bloklamaydi</strong>: oshib ketgani faqat bosh ekrandagi bo&apos;limlar jadvalida belgilanadi.
            Bo&apos;sh qoldirilsa limit hisobga olinmaydi.
          </p>
          </>
        )}
      </Card>
    </AppShell>
  );
}

/** `useSearchParams()` Suspense chegarasini talab qiladi (Next.js 16). */
export default function DepartmentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-muted">Yuklanmoqda...</div>}>
      <DepartmentsView />
    </Suspense>
  );
}
