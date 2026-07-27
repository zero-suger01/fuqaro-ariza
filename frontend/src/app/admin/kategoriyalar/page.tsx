"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Save, Sparkles, X } from "lucide-react";
import { clsx } from "clsx";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import type { CategoryAdmin, DepartmentAdmin } from "@/lib/types";

/** v1.3 — keyword lug'ati olib tashlangach bu sahifa AI'ning QAROR MAYDONINI
 * boshqaradi: LLM faqat shu ro'yxatdagi kategoriyalardan birini tanlaydi, va
 * tanlangan kategoriyaning bo'limi murojaat qayerga yo'naltirilishini,
 * `sla_hours` esa muddatni belgilaydi. */
/** Tahrir formasi alohida komponent va `key={category.id}` bilan chaqiriladi:
 * kategoriya almashganda React uni qaytadan yaratadi, ya'ni holat effekt
 * ichida setState qilmasdan yangilanadi (React Compiler talabi). */
function CategoryForm({
  category,
  departments,
  onSaved,
}: {
  category: CategoryAdmin;
  departments: DepartmentAdmin[];
  onSaved: (updated: CategoryAdmin) => void;
}) {
  const [sla, setSla] = useState(String(category.sla_hours));
  const [departmentId, setDepartmentId] = useState(category.department_id ?? "");
  const [isActive, setIsActive] = useState(category.is_active);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const departmentName = (id: string | null) =>
    departments.find((d) => d.id === id)?.names.uz ?? "— biriktirilmagan —";

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiPatch<CategoryAdmin>(`/api/admin/categories/${category.id}`, {
        sla_hours: Number(sla),
        department_id: departmentId || null,
        is_active: isActive,
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
    <>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-text-primary">{category.names.uz ?? category.code}</h2>
        <span className="text-xs font-mono text-text-muted">{category.code}</span>
      </div>
      <p className="text-sm text-text-muted mb-5">
        Hozir bu kategoriya <strong className="text-text-primary">{departmentName(category.department_id)}</strong>{" "}
        bo&apos;limiga yo&apos;naltiriladi.
      </p>

      <div className="flex flex-col gap-4 max-w-md">
        <div>
          <Label>Mas&apos;ul bo&apos;lim</Label>
          <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">— biriktirilmagan —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.names.uz ?? d.code}
              </option>
            ))}
          </Select>
          {!departmentId && (
            <p className="text-xs text-warning mt-1">
              Bo&apos;limsiz kategoriyaga tushgan murojaat avtomatik yo&apos;naltirilmaydi — admin qo&apos;lda
              biriktirishi kerak bo&apos;ladi.
            </p>
          )}
        </div>

        <div>
          <Label>Javob muddati (soat)</Label>
          <Input type="number" min={1} value={sla} onChange={(e) => setSla(e.target.value)} />
          <p className="text-xs text-text-muted mt-1">
            Muhimlik yuqori bo&apos;lsa muddat avtomatik qisqaradi (critical — 2 soat).
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Faol (AI shu kategoriyani tanlay oladi)
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}
        {saved && <p className="text-sm text-success">Saqlandi</p>}

        <Button onClick={save} disabled={saving} className="self-start">
          <Save className="h-4 w-4" /> Saqlash
        </Button>
      </div>
    </>
  );
}

function CategoriesView() {
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("q") ?? "").trim().toLowerCase();

  const [categories, setCategories] = useState<CategoryAdmin[]>([]);
  const [departments, setDepartments] = useState<DepartmentAdmin[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<CategoryAdmin[]>("/api/admin/categories").then((cats) => {
      setCategories(cats);
      setSelectedId(cats[0]?.id ?? null);
    });
    apiGet<DepartmentAdmin[]>("/api/admin/departments").then(setDepartments).catch(() => {});
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await apiPost<CategoryAdmin>("/api/admin/categories", {
        code: newCode.trim(),
        names: { uz: newName.trim() },
      });
      setCategories((prev) => [...prev, created]);
      setSelectedId(created.id);
      setNewCode("");
      setNewName("");
      setShowCreateForm(false);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(cat: CategoryAdmin) {
    if (!window.confirm(`"${cat.names.uz ?? cat.code}" kategoriyasini o'chirmoqchimisiz?`)) return;
    setDeletingId(cat.id);
    setDeleteError(null);
    try {
      await apiDelete(`/api/admin/categories/${cat.id}`);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      setSelectedId((prev) => (prev === cat.id ? null : prev));
    } catch (err) {
      // Murojaatlarda ishlatilgan kategoriyalar o'chirilMAYDI (backend
      // tekshiradi) — sababi shu yerda ko'rsatiladi (app/routers/admin.py).
      setDeleteError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setDeletingId(null);
    }
  }

  const selected = categories.find((c) => c.id === selectedId) ?? null;

  // Topbar qidiruvi (mijoz so'ragan) — nom/kod bo'yicha mahalliy filtr.
  const visibleCategories = useMemo(() => {
    if (!searchQuery) return categories;
    return categories.filter((c) =>
      [c.names.uz, c.code].filter(Boolean).some((f) => f!.toLowerCase().includes(searchQuery))
    );
  }, [categories, searchQuery]);

  return (
    <AppShell title="Kategoriyalar" requireRoles={["admin"]}>
      <Card>
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
          <p className="text-sm text-text-secondary">
            Sun&apos;iy intellekt har bir murojaat uchun shu ro&apos;yxatdan bitta kategoriyani tanlaydi va uni
            kategoriyaning bo&apos;limiga avtomatik yo&apos;naltiradi. Ya&apos;ni <strong>bo&apos;lim</strong> — murojaat
            kimga tushishini, <strong>javob muddati</strong> — qancha vaqt ichida hal qilinishi kerakligini
            belgilaydi. Nofaol kategoriyani AI tanlay olmaydi.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-primary">Kategoriyalar</h2>
            <button
              type="button"
              onClick={() => setShowCreateForm((v) => !v)}
              className="flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              <Plus className="h-4 w-4" /> qo&apos;shish
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreate} className="flex flex-col gap-2 mb-4 pb-4 border-b border-border">
              <div>
                <Label>Kod</Label>
                <Input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="masalan: bogchalar"
                  required
                />
              </div>
              <div>
                <Label>Nomi (uz)</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              {createError && <p className="text-xs text-danger">{createError}</p>}
              <Button type="submit" disabled={creating} className="self-start">
                {creating ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </form>
          )}

          {deleteError && <p className="text-xs text-danger mb-2">{deleteError}</p>}
          {searchQuery && visibleCategories.length === 0 && (
            <p className="text-sm text-text-muted py-4 text-center">Qidiruvga mos kategoriya topilmadi</p>
          )}

          <div className="flex flex-col gap-1">
            {visibleCategories.map((cat) => (
              <div key={cat.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedId(cat.id)}
                  className={clsx(
                    "flex-1 min-w-0 text-left rounded-inner px-3 py-2.5 text-sm transition",
                    selectedId === cat.id
                      ? "bg-accent-soft text-accent font-medium"
                      : "text-text-primary hover:bg-bg-subtle"
                  )}
                >
                  {cat.names.uz ?? cat.code}
                  {!cat.is_active && <span className="text-text-muted"> (nofaol)</span>}
                </button>
                {/* Mijoz so'ragan: "x" standart holatda ko'rinmaydi, faqat
                    qator ustiga sichqoncha kelganda (yoki tab bilan
                    fokuslanganda) chiqadi. */}
                <button
                  type="button"
                  onClick={() => handleDelete(cat)}
                  disabled={deletingId === cat.id}
                  aria-label={`${cat.names.uz ?? cat.code} kategoriyasini o'chirish`}
                  className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-danger/70 opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          {selected ? (
            <CategoryForm
              key={selected.id}
              category={selected}
              departments={departments}
              onSaved={(updated) =>
                setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
              }
            />
          ) : (
            <div className="py-14 text-center text-text-muted text-sm">Kategoriya tanlang</div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

/** `useSearchParams()` Suspense chegarasini talab qiladi (Next.js 16). */
export default function CategoriesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-muted">Yuklanmoqda...</div>}>
      <CategoriesView />
    </Suspense>
  );
}
