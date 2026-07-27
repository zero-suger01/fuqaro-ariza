"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Pencil, Sparkles, Split, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Label, Select, Textarea } from "@/components/ui/Input";
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/status";
import type { CategoryAdmin, ComplaintListItem, DepartmentAdmin, Page } from "@/lib/types";

/** docs/03 §5 — `POST .../review` `reason` qiymatlari. */
type ReviewReason = "ok" | "wrong_category" | "wrong_department" | "wrong_priority" | "other";

const REVIEW_REASON_OPTIONS: [ReviewReason, string][] = [
  ["wrong_category", "Noto'g'ri kategoriya"],
  ["wrong_department", "Noto'g'ri bo'lim"],
  ["wrong_priority", "Noto'g'ri muhimlik"],
  ["other", "Boshqa sabab"],
];

/** AI_LOW_CONFIDENCE=0.6 (docs/07 §3) — shundan past bo'lsa xavotirli,
 * 0.85+ bo'lsa ishonchli (ko'p bo'limli murojaatda ham 0.95 chiqadi,
 * docs/07 §1.1). Rang shkalasi Badge'ning boshqa joylardagi (Priority,
 * Status) semantikasi bilan bir xil. */
function confidenceColor(confidence: number): string {
  if (confidence >= 0.85) return "var(--success)";
  if (confidence >= 0.6) return "var(--warning)";
  return "var(--danger)";
}

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
  const [busySubtask, setBusySubtask] = useState<string | null>(null);
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

  /** Admin ikkinchi bo'lim noto'g'ri deb hisoblasa (masalan bitta tashkilot
   * hal qila oladi) — sub-taskni shu yerdan, murojaatni ochmasdan bekor
   * qilish (PATCH /subtasks/{id}, docs/03 §5). Asosiy kategoriya/bo'lim va
   * `needs_review` bunga bog'liq emas — admin xohlasa ularni alohida
   * "To'g'ri"/"Saqlash" bilan yopadi. */
  async function cancelSubtask(subtaskId: string, complaintId: string) {
    setBusySubtask(subtaskId);
    setError(null);
    try {
      await apiPatch(`/api/admin/subtasks/${subtaskId}`, { status: "cancelled" });
      setItems((prev) =>
        prev.map((item) =>
          item.id === complaintId && item.ai
            ? { ...item, ai: { ...item.ai, open_subtasks: item.ai.open_subtasks.filter((s) => s.id !== subtaskId) } }
            : item
        )
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setBusySubtask(null);
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
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/murojaatlar/${c.id}`}
                        className="shrink-0 whitespace-nowrap text-xs font-mono text-text-muted hover:text-accent transition-colors"
                      >
                        {c.ticket_number}
                      </Link>
                      <Badge label={PRIORITY_LABELS[c.priority]} color={PRIORITY_COLORS[c.priority]} />
                    </div>

                    <p className="text-sm text-text-primary leading-relaxed line-clamp-2">
                      {c.description_snippet || c.ai?.summary || c.category.name}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" aria-hidden />
                        {suggestion ? (
                          <Badge label={suggestion.name} color="var(--accent)" />
                        ) : (
                          <Badge label="Kategoriyani aniqlay olmadi" color="var(--danger)" />
                        )}
                      </span>
                      {suggestion && c.ai?.confidence != null && (
                        <Badge
                          label={`${Math.round(c.ai.confidence * 100)}% ishonch`}
                          color={confidenceColor(c.ai.confidence)}
                        />
                      )}
                      {c.department && (
                        <span className="inline-flex items-center gap-1.5">
                          <ArrowRight className="h-3 w-3 text-text-muted shrink-0" aria-hidden />
                          <Badge label={c.department.name} color="var(--info)" />
                        </span>
                      )}
                    </div>

                    {/* v1.5 ko'p bo'limli murojaat ([07] §1.1) — sub-task bu
                        ro'yxatda ko'rsatilmasa, admin murojaatni ochmasdan
                        bo'linish bo'lganini bilmaydi va uni bekor qila
                        olmaydi (AI ikkalasiga ham yo'naltirishi noto'g'ri
                        bo'lishi mumkin — bitta tashkilot yetarli bo'lsa). */}
                    {c.ai && c.ai.open_subtasks.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Split className="h-3.5 w-3.5 text-warning shrink-0" aria-hidden />
                        {c.ai.open_subtasks.map((s) => (
                          <span
                            key={s.id}
                            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-pill bg-warning/10 py-1 pl-3 pr-1.5 text-xs font-medium text-warning"
                          >
                            + {s.department_name}
                            <button
                              type="button"
                              onClick={() => cancelSubtask(s.id, c.id)}
                              disabled={busySubtask === s.id}
                              aria-label={`${s.department_name} bo'limiga topshiriqni bekor qilish`}
                              title="Bekor qilish"
                              className="flex h-5 w-5 items-center justify-center rounded-full text-warning transition-colors hover:bg-warning/25 disabled:opacity-50"
                            >
                              <X className="h-3 w-3" aria-hidden />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* v1.8 — AI topgan, lekin chegara tufayli avtomatik
                        ajratilMAGAN xizmatlar ([07] §1.1). Bu yuqoridagi
                        sub-task chiplaridan KUCHLIROQ signal: u yerda ish
                        allaqachon bo'limga tushgan va admin faqat
                        tasdiqlaydi, bu yerda esa fuqaroning muammosi hali
                        HECH KIMDA yo'q. Shuning uchun danger rangida va
                        harakatni aytadigan matn bilan (rang yolg'iz signal
                        emas — ikon va yozuv ham bor, docs/10 §8). */}
                    {c.ai && c.ai.unassigned_services.length > 0 && (
                      <div className="flex flex-col gap-1.5 rounded-inner border border-danger/30 bg-danger/5 px-3 py-2">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          Bu xizmatlarga topshiriq ochilmagan — qo&apos;lda ajrating
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {c.ai.unassigned_services.map((name) => (
                            <span
                              key={name}
                              className="inline-flex shrink-0 items-center rounded-pill bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
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
