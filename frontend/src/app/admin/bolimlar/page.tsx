"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { clsx } from "clsx";
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
// backend seed'dagi haqiqiy kodlar. Ro'yxatda yo'q yangi kod uchun
// `Building2` zaxira bo'lib qoladi.
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

/** Ikonkani JSX ichida tanlash `react-hooks/static-components` ni buzadi
 *  (komponent render paytida yaratiladi), shuning uchun tanlov shu
 *  hooksiz, modul darajasidagi komponent ichida qoladi. */
function DeptGlyph({ code, className }: { code: string; className?: string }) {
  const Icon: LucideIcon = DEPARTMENT_ICONS[code] ?? Building2;
  return <Icon className={className} aria-hidden />;
}

/**
 * Bitta bo'limning tahrirlagichi.
 *
 * Avval bu sahifada tahrirlagich UMUMAN yo'q edi: qatorda faqat yuklama
 * limiti va faol/nofaol tugmasi bor edi, telefon va email esa faqat
 * yaratishda kiritilib, keyin hech qachon o'zgartirib bo'lmasdi —
 * holbuki `PATCH /departments/{id}` ularni allaqachon qabul qilardi.
 *
 * `code` o'zgarmaydi va shuning uchun faqat ko'rsatiladi: AI kategoriyani
 * bo'limga aynan shu kod orqali bog'laydi, uni almashtirish tinch
 * yo'naltirishni buzardi.
 */
function DepartmentForm({
  department,
  onSaved,
}: {
  department: DepartmentAdmin;
  onSaved: (updated: DepartmentAdmin) => void;
}) {
  const [nameUz, setNameUz] = useState(department.names.uz ?? "");
  const [phone, setPhone] = useState(department.phone ?? "");
  const [email, setEmail] = useState(department.email ?? "");
  const [isExternal, setIsExternal] = useState(department.is_external);
  const [isActive, setIsActive] = useState(department.is_active);
  const [wipLimit, setWipLimit] = useState(department.wip_limit?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedLimit = wipLimit.trim();
    const limit = trimmedLimit === "" ? null : Number(trimmedLimit);
    if (limit !== null && (!Number.isInteger(limit) || limit < 0)) {
      setError("Yuklama limiti butun va manfiy bo'lmagan son bo'lishi kerak");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await apiPatch<DepartmentAdmin>(`/api/admin/departments/${department.id}`, {
        // Boshqa tillardagi nomlar saqlanib qoladi — faqat `uz` almashadi.
        names: { ...department.names, uz: nameUz.trim() },
        phone: phone.trim() || null,
        email: email.trim() || null,
        is_external: isExternal,
        is_active: isActive,
        wip_limit: limit,
      });
      onSaved(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-inner bg-accent-soft">
          <DeptGlyph code={department.code} className="h-5 w-5 text-accent" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-text-primary">{department.names.uz ?? department.code}</h2>
          <p className="font-mono text-xs text-text-muted">{department.code}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Nomi</Label>
          <Input value={nameUz} onChange={(e) => setNameUz(e.target.value)} required />
        </div>
        <div>
          <Label>Telefon</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998..." />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </div>
        <div>
          <Label>Yuklama limiti</Label>
          <Input
            type="number"
            min={0}
            value={wipLimit}
            onChange={(e) => setWipLimit(e.target.value)}
            placeholder="cheklanmagan"
          />
          <p className="mt-1.5 text-xs text-text-muted">
            Bir vaqtda qulay olib borilagan aktiv ish soni. Hech narsani <strong>bloklamaydi</strong> — oshgani
            bosh ekrandagi jadvalda belgilanadi.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={isExternal}
            onChange={(e) => setIsExternal(e.target.checked)}
          />
          Tashqi tashkilot (ichki bo&apos;lim bo&apos;lsa belgilamang)
        </label>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Faol (nofaol bo&apos;limga murojaat yo&apos;naltirilmaydi)
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving} className="self-start">
          {saving ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
        {saved && !saving && <span className="text-sm text-success">Saqlandi</span>}
      </div>
    </form>
  );
}

function DepartmentsView() {
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("q") ?? "").trim().toLowerCase();

  const [departments, setDepartments] = useState<DepartmentAdmin[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<DepartmentAdmin[]>("/api/admin/departments").then(setDepartments);
  }, []);

  // Topbar qidiruvi — nom/kod bo'yicha mahalliy filtr.
  const visibleDepartments = useMemo(() => {
    if (!searchQuery) return departments;
    return departments.filter((d) =>
      [d.names.uz, d.code].filter(Boolean).some((f) => f!.toLowerCase().includes(searchQuery))
    );
  }, [departments, searchQuery]);

  const selected = departments.find((d) => d.id === selectedId) ?? null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await apiPost<DepartmentAdmin>("/api/admin/departments", {
        code: form.code,
        names: { uz: form.name_uz },
        phone: form.phone || null,
        email: form.email || null,
        is_external: form.is_external,
        is_active: true,
      });
      setDepartments((prev) => [...prev, created]);
      setSelectedId(created.id);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Bo'limlar" requireRoles={["district_admin", "system_admin"]}>
      <Card>
        <div className="flex items-start gap-2">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p className="text-sm text-text-secondary">
            Bo&apos;lim — murojaat kimga tushishini belgilaydi: AI kategoriyani tanlagach, murojaat shu
            kategoriyaga biriktirilgan bo&apos;limga yo&apos;naltiriladi. Ro&apos;yxatdan bo&apos;limni tanlang
            va o&apos;ng tomonda tahrirlang.
          </p>
        </div>
      </Card>

      {/* Master-detail — `Kategoriyalar` sahifasidagi bilan bir xil naqsh.
          Avval bu yerda ikki ustunli karta to'ri turardi va kartaning
          kengligini limit inputi bilan tugmalar egallab olardi, ya'ni
          qatorni ajratib turadigan YAGONA narsa — nom — «Bandlik va...»,
          «Kommunal xo'j...» bo'lib qirqilardi. Endi nom to'liq ko'rinadi
          va tahrirlash uchun joy alohida ustunda. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary">Bo&apos;lim va tashkilotlar</h2>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
            >
              <Plus className="h-4 w-4" /> qo&apos;shish
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="mb-4 flex flex-col gap-3 border-b border-border pb-4">
              <div>
                <Label>Kod</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  required
                  placeholder="masalan: suvsoz"
                />
              </div>
              <div>
                <Label>Nomi</Label>
                <Input
                  value={form.name_uz}
                  onChange={(e) => setForm((f) => ({ ...f, name_uz: e.target.value }))}
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={form.is_external}
                  onChange={(e) => setForm((f) => ({ ...f, is_external: e.target.checked }))}
                />
                Tashqi tashkilot
              </label>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" disabled={saving} className="self-start">
                Saqlash
              </Button>
            </form>
          )}

          {departments.length === 0 ? (
            <p className="py-14 text-center text-sm text-text-muted">Bo&apos;limlar topilmadi</p>
          ) : visibleDepartments.length === 0 ? (
            <p className="py-14 text-center text-sm text-text-muted">Qidiruvga mos bo&apos;lim topilmadi</p>
          ) : (
            <div className="flex flex-col gap-1">
              {visibleDepartments.map((dept) => {
                const isSelected = dept.id === selectedId;
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => setSelectedId(dept.id)}
                    aria-label={dept.names.uz ?? dept.code}
                    aria-current={isSelected ? "true" : undefined}
                    className={clsx(
                      "press flex w-full items-center gap-2.5 rounded-inner px-3 py-2.5 text-left",
                      isSelected ? "bg-accent-soft" : "hover:bg-bg-subtle"
                    )}
                  >
                    <DeptGlyph
                      code={dept.code}
                      className={clsx("h-4 w-4 shrink-0", isSelected ? "text-accent" : "text-text-muted")}
                    />
                    {/* `truncate` YO'Q — nom to'liq ko'rinishi shart, kerak
                        bo'lsa ikki qatorga o'ralsin. */}
                    <span className="min-w-0 flex-1">
                      <span
                        className={clsx(
                          "block text-sm leading-snug",
                          isSelected ? "font-semibold text-accent" : "text-text-primary"
                        )}
                      >
                        {dept.names.uz ?? dept.code}
                      </span>
                      <span className="block text-xs text-text-muted">
                        {dept.is_external ? "Tashqi" : "Ichki"}
                        {dept.wip_limit != null && ` · limit ${dept.wip_limit}`}
                        {!dept.is_active && " · nofaol"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          {selected ? (
            <DepartmentForm
              key={selected.id}
              department={selected}
              onSaved={(updated) =>
                setDepartments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
              }
            />
          ) : (
            <div className="py-14 text-center text-sm text-text-muted">Bo&apos;limni tanlang</div>
          )}
        </Card>
      </div>
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
