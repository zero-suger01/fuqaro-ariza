"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Pencil, Sparkles, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Input";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import type { CategoryAdmin, ComplaintListItem, DepartmentAdmin, Page } from "@/lib/types";

/** R2/Q3 — «Tasdiqlash navbati»: AI ishonchsiz bo'lgan (needs_review)
 * murojaatlar. Bir bosishda AI taklifini qabul qilish (POST review, bo'sh
 * body) yoki kategoriya/bo'limni to'g'irlab qabul qilish. Eski oqim (har
 * murojaatni ochib, qo'lda kategoriya+bo'lim tanlash) shu bilan almashadi. */
export default function TasdiqlashPage() {
  const [items, setItems] = useState<ComplaintListItem[]>([]);
  const [categories, setCategories] = useState<CategoryAdmin[]>([]);
  const [departments, setDepartments] = useState<DepartmentAdmin[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    apiGet<Page<ComplaintListItem>>("/api/admin/complaints?needs_review=1&page=1&page_size=50")
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    apiGet<CategoryAdmin[]>("/api/admin/categories").then(setCategories).catch(() => {});
    apiGet<DepartmentAdmin[]>("/api/admin/departments").then(setDepartments).catch(() => {});
  }, []);

  async function accept(c: ComplaintListItem, body: { category_code?: string; department_id?: string }) {
    setBusy(c.id);
    setError(null);
    try {
      await apiPost(`/api/admin/complaints/${c.id}/review`, body);
      setEditing(null);
      setItems((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setBusy(null);
    }
  }

  function startEdit(c: ComplaintListItem) {
    setEditing(c.id);
    setEditCategory(c.ai?.suggested_category?.code ?? c.category.code);
    setEditDepartment("");
  }

  return (
    <AppShell title="Tasdiqlash navbati" requireRoles={["admin"]}>
      {error && <div className="rounded-inner bg-danger/10 text-danger text-sm px-4 py-3">{error}</div>}

      <p className="text-sm text-text-secondary max-w-2xl">
        AI ishonchsiz bo&apos;lgan yoki kalit so&apos;z va LLM kelishmagan murojaatlar. «Qabul» — AI taklifini bir
        bosishda tasdiqlaydi (kategoriya + bo&apos;limga biriktirish); «O&apos;zgartirish» — to&apos;g&apos;irlab qabul
        qilish.
      </p>

      {loading ? (
        <div className="py-10 text-center text-text-muted text-sm">Yuklanmoqda...</div>
      ) : items.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-text-muted text-sm">
            Navbat bo&apos;sh — barcha murojaatlar avtomatik yo&apos;naltirilgan ✨
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((c) => {
            const suggestion = c.ai?.suggested_category;
            const isEditing = editing === c.id;
            return (
              <Card key={c.id}>
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/admin/murojaatlar/${c.id}`}
                      className="text-xs font-mono text-text-muted hover:text-accent"
                    >
                      {c.ticket_number}
                    </Link>
                    <p className="text-sm text-text-primary mt-0.5 line-clamp-2">
                      {c.description_snippet || c.ai?.summary || c.category.name}
                    </p>
                    <p className="text-xs text-text-secondary mt-1 flex items-center gap-1 flex-wrap">
                      <Sparkles className="h-3 w-3 text-accent shrink-0" />
                      {suggestion ? (
                        <>
                          AI taklifi: <strong className="text-accent">{suggestion.name}</strong>
                          {c.ai?.confidence != null && <> · ishonch {Math.round(c.ai.confidence * 100)}%</>}
                        </>
                      ) : (
                        <>AI taklif bera olmadi — hozirgi kategoriya: {c.category.name}</>
                      )}
                      {c.department && <> · hozir: {c.department.name}</>}
                    </p>
                  </div>

                  {!isEditing ? (
                    <div className="flex gap-2 shrink-0">
                      <Button onClick={() => accept(c, {})} disabled={busy === c.id}>
                        <Check className="h-4 w-4" /> Qabul
                      </Button>
                      <Button variant="secondary" onClick={() => startEdit(c)} disabled={busy === c.id}>
                        <Pencil className="h-4 w-4" /> O&apos;zgartirish
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0 sm:items-end">
                      <div>
                        <Label>Kategoriya</Label>
                        <Select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.code}>
                              {cat.names.uz ?? cat.code}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label>Bo&apos;lim (ixtiyoriy)</Label>
                        <Select value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)}>
                          <option value="">Kategoriya bo&apos;limi</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.names.uz ?? d.code}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            accept(c, {
                              category_code: editCategory || undefined,
                              department_id: editDepartment || undefined,
                            })
                          }
                          disabled={busy === c.id}
                        >
                          <Check className="h-4 w-4" /> Saqlash
                        </Button>
                        <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy === c.id}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
