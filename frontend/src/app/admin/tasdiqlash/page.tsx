"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Pencil, Sparkles, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Select, Textarea } from "@/components/ui/Input";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import type { CategoryAdmin, ComplaintListItem, DepartmentAdmin, Page } from "@/lib/types";

/** docs/03 §5 — `POST .../review` `reason` qiymatlari. */
type ReviewReason = "ok" | "wrong_category" | "wrong_department" | "wrong_priority" | "other";

const REVIEW_REASON_OPTIONS: [ReviewReason, string][] = [
  ["wrong_category", "Noto'g'ri kategoriya"],
  ["wrong_department", "Noto'g'ri bo'lim"],
  ["wrong_priority", "Noto'g'ri muhimlik"],
  ["other", "Boshqa sabab"],
];

/** v1.3 — «AI nazorati»: AI o'zi ikkilanib (past ishonch bilan) yo'naltirgan
 * murojaatlar. MUHIM: bu navbat EMAS — murojaatlar allaqachon bo'limga
 * yuborilgan va ijroda; bu sahifa faqat nazorat uchun. Admin hech narsa
 * qilmasa ham ish davom etadi; «To'g'ri» — belgini olib tashlaydi,
 * «To'g'irlash» — kategoriya/bo'limni almashtiradi. */
export default function TasdiqlashPage() {
  const [items, setItems] = useState<ComplaintListItem[]>([]);
  const [categories, setCategories] = useState<CategoryAdmin[]>([]);
  const [departments, setDepartments] = useState<DepartmentAdmin[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  // v1.4: tuzatish sababi majburiy — usiz AI sifatini o'lchab bo'lmasdi,
  // faqat «admin nimanidir o'zgartirdi» degan fakt qolardi (docs/03 §5).
  const [editReason, setEditReason] = useState<ReviewReason>("wrong_category");
  const [editReasonText, setEditReasonText] = useState("");
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

  async function accept(
    c: ComplaintListItem,
    body: { category_code?: string; department_id?: string; reason: ReviewReason; reason_text?: string }
  ) {
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
    setEditReason("wrong_category");
    setEditReasonText("");
  }

  return (
    <AppShell title="AI nazorati" requireRoles={["admin"]}>
      {error && <div className="rounded-inner bg-danger/10 text-danger text-sm px-4 py-3">{error}</div>}

      <p className="text-sm text-text-secondary max-w-2xl">
        Sun&apos;iy intellekt <strong>o&apos;zi ikkilangan</strong> murojaatlar. Ular allaqachon bo&apos;limga
        yo&apos;naltirilgan va ijroda — bu navbat emas, nazorat. Siz hech narsa qilmasangiz ham ish davom etadi.
        «To&apos;g&apos;ri» — belgini olib tashlaydi; «To&apos;g&apos;irlash» — kategoriya yoki bo&apos;limni
        almashtiradi.
      </p>

      {loading ? (
        <div className="py-10 text-center text-text-muted text-sm">Yuklanmoqda...</div>
      ) : items.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-text-muted text-sm">
            AI hamma narsani ishonch bilan hal qilgan — tekshiradigan narsa yo&apos;q ✨
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
                          AI tanlovi: <strong className="text-accent">{suggestion.name}</strong>
                          {c.ai?.confidence != null && <> · ishonch {Math.round(c.ai.confidence * 100)}%</>}
                        </>
                      ) : (
                        <>AI kategoriyani aniqlay olmadi — hozir: {c.category.name}</>
                      )}
                      {c.department && <> · yo&apos;naltirildi: {c.department.name}</>}
                    </p>
                  </div>

                  {!isEditing ? (
                    <div className="flex gap-2 shrink-0">
                      <Button onClick={() => accept(c, { reason: "ok" })} disabled={busy === c.id}>
                        <Check className="h-4 w-4" /> To&apos;g&apos;ri
                      </Button>
                      <Button variant="secondary" onClick={() => startEdit(c)} disabled={busy === c.id}>
                        <Pencil className="h-4 w-4" /> To&apos;g&apos;irlash
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 shrink-0 md:w-[380px]">
                      <div className="grid grid-cols-2 gap-2">
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
                      </div>
                      <div>
                        <Label>AI nimani xato qildi? (majburiy)</Label>
                        <Select
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value as ReviewReason)}
                        >
                          {REVIEW_REASON_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </Select>
                      </div>
                      {editReason === "other" && (
                        <Textarea
                          rows={2}
                          value={editReasonText}
                          onChange={(e) => setEditReasonText(e.target.value)}
                          placeholder="Qisqa izoh (majburiy)"
                        />
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            accept(c, {
                              category_code: editCategory || undefined,
                              department_id: editDepartment || undefined,
                              reason: editReason,
                              reason_text: editReasonText.trim() || undefined,
                            })
                          }
                          disabled={busy === c.id || (editReason === "other" && !editReasonText.trim())}
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
