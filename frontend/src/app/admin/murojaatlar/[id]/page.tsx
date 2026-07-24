"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { AlertTriangle, Image as ImageIcon, MessageSquare, Send, Sparkles, User as UserIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Label, Select, Textarea } from "@/components/ui/Input";
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ComplaintDetail, ComplaintStatus, DepartmentAdmin } from "@/lib/types";
import {
  ACTOR_LABELS,
  EVENT_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  ROLE_ALLOWED_STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_TRANSITIONS,
} from "@/lib/status";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

export default function AdminComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [departments, setDepartments] = useState<DepartmentAdmin[]>([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [comment, setComment] = useState("");
  const [replyText, setReplyText] = useState("");
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiGet<ComplaintDetail>(`/api/admin/complaints/${id}`).then((c) => {
      setComplaint(c);
      setReplyText((prev) => prev || c.ai?.suggested_reply || "");
    });
  }

  useEffect(() => {
    load();
    apiGet<DepartmentAdmin[]>("/api/admin/departments").then(setDepartments).catch(() => setDepartments([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function changeStatus(status: ComplaintStatus, note?: string) {
    setSaving(true);
    setError(null);
    try {
      await apiPatch(`/api/admin/complaints/${id}/status`, { status, note });
      setRejectReason(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign() {
    if (!selectedDept) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/admin/complaints/${id}/assign`, { department_id: selectedDept });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/admin/complaints/${id}/comments`, { text: comment });
      setComment("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/admin/complaints/${id}/replies`, { text: replyText });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  if (!complaint) {
    return (
      <AppShell title="Murojaat tafsiloti">
        <div className="py-10 text-center text-text-muted text-sm">Yuklanmoqda...</div>
      </AppShell>
    );
  }

  const roleAllowed = ROLE_ALLOWED_STATUSES[user?.role ?? ""];
  const allowedTargets = (STATUS_TRANSITIONS[complaint.status] ?? [])
    .filter((s) => s !== "assigned") // assignment happens via the biriktirish card, not a raw status button
    .filter((s) => roleAllowed === null || roleAllowed === undefined || roleAllowed.includes(s));

  const images = complaint.files.filter((f) => f.kind === "image");
  const otherFiles = complaint.files.filter((f) => f.kind !== "image");

  return (
    <AppShell title={`Murojaat ${complaint.ticket_number}`}>
      {error && (
        <div className="rounded-inner bg-danger/10 text-danger text-sm px-4 py-3">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {images.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="h-4 w-4 text-accent" />
                <h2 className="text-base font-semibold text-text-primary">Media</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.id}
                    src={img.url}
                    alt="murojaat rasmi"
                    className="aspect-square object-cover rounded-inner border border-border"
                  />
                ))}
              </div>
              {otherFiles.length > 0 && (
                <div className="flex flex-col gap-2 mt-4">
                  {otherFiles.map((f) => (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-accent hover:underline"
                    >
                      {f.kind === "video" ? "🎥" : "🎵"} {f.kind} faylni ochish
                    </a>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-text-primary">Murojaat matni</h2>
              <span className="text-xs text-text-muted uppercase">{complaint.language}</span>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{complaint.description}</p>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <UserIcon className="h-4 w-4 text-accent" />
              <h2 className="text-base font-semibold text-text-primary">Fuqaro</h2>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-text-muted">Ism</dt>
                <dd className="text-text-primary font-medium">{complaint.citizen.fullname || "—"}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Telefon</dt>
                <dd className="text-text-primary font-medium">{complaint.citizen.phone}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Mahalla</dt>
                <dd className="text-text-primary font-medium">{complaint.neighborhood_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Manzil</dt>
                <dd className="text-text-primary font-medium">{complaint.address ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Manba</dt>
                <dd className="text-text-primary font-medium">{complaint.source}</dd>
              </div>
            </dl>
          </Card>

          {complaint.latitude != null && complaint.longitude != null && (
            <Card>
              <h2 className="text-base font-semibold text-text-primary mb-4">Joylashuv</h2>
              <MapPicker lat={complaint.latitude} lng={complaint.longitude} onChange={() => {}} />
            </Card>
          )}

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-4 w-4 text-accent" />
              <h2 className="text-base font-semibold text-text-primary">Ichki izohlar</h2>
            </div>
            <form onSubmit={handleComment} className="flex gap-2 mb-4">
              <Textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Izoh yozing (fuqaroga ko'rinmaydi)..."
                className="flex-1"
              />
              <Button type="submit" disabled={saving} className="self-end">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <div className="flex flex-col gap-3">
              {complaint.events
                .filter((e) => e.event_type === "comment_added")
                .reverse()
                .map((e) => (
                  <div key={e.id} className="rounded-inner bg-bg-subtle px-4 py-3">
                    <p className="text-sm text-text-primary">{String(e.payload?.text ?? "")}</p>
                    <p className="text-xs text-text-muted mt-1">{new Date(e.created_at).toLocaleString("uz-UZ")}</p>
                  </div>
                ))}
              {complaint.events.filter((e) => e.event_type === "comment_added").length === 0 && (
                <p className="text-sm text-text-muted">Hozircha izohlar yo&apos;q</p>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-text-primary mb-4">Voqealar tarixi</h2>
            <div className="flex flex-col gap-3">
              {complaint.events.map((e) => (
                <div key={e.id} className="flex items-start gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-accent mt-1.5 shrink-0" />
                  <div>
                    <p className="text-text-primary">
                      <span className="font-medium">{EVENT_LABELS[e.event_type] ?? e.event_type}</span>{" "}
                      <span className="text-text-muted">— {ACTOR_LABELS[e.actor_type] ?? e.actor_type}</span>
                    </p>
                    <p className="text-xs text-text-muted">{new Date(e.created_at).toLocaleString("uz-UZ")}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-text-primary">Holat</h2>
              <Badge label={STATUS_LABELS[complaint.status]} color={STATUS_COLORS[complaint.status]} />
            </div>
            <dl className="flex flex-col gap-3 text-sm mb-4">
              <div className="flex justify-between">
                <dt className="text-text-muted">Kategoriya</dt>
                <dd className="text-text-primary font-medium">{complaint.category.name}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-text-muted">Muhimlik</dt>
                <dd>
                  <Badge label={PRIORITY_LABELS[complaint.priority]} color={PRIORITY_COLORS[complaint.priority]} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Muddat</dt>
                <dd className="text-text-primary font-medium">
                  {complaint.deadline_at ? new Date(complaint.deadline_at).toLocaleString("uz-UZ") : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Yaratilgan</dt>
                <dd className="text-text-primary font-medium">{new Date(complaint.created_at).toLocaleString("uz-UZ")}</dd>
              </div>
              {complaint.rejected_reason && (
                <div>
                  <dt className="text-text-muted">Rad etish sababi</dt>
                  <dd className="text-danger font-medium">{complaint.rejected_reason}</dd>
                </div>
              )}
            </dl>

            {allowedTargets.length > 0 && (
              <div className="flex flex-col gap-2 pt-3 border-t border-border">
                {allowedTargets.map((target) =>
                  target === "rejected" ? (
                    <div key={target} className="flex flex-col gap-2">
                      {rejectReason !== null ? (
                        <>
                          <Textarea
                            rows={2}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Rad etish sababi (majburiy)"
                          />
                          <Button
                            variant="danger"
                            disabled={saving || !rejectReason.trim()}
                            onClick={() => changeStatus("rejected", rejectReason)}
                          >
                            Rad etishni tasdiqlash
                          </Button>
                        </>
                      ) : (
                        <Button variant="danger" disabled={saving} onClick={() => setRejectReason("")}>
                          {STATUS_LABELS.rejected}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button key={target} variant="secondary" disabled={saving} onClick={() => changeStatus(target)}>
                      {STATUS_LABELS[target]}
                    </Button>
                  )
                )}
              </div>
            )}
          </Card>

          {complaint.ai && (
            <Card className={complaint.needs_review ? "border-2 border-warning" : undefined}>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-accent" />
                <h2 className="text-base font-semibold text-text-primary">AI tahlili</h2>
                {complaint.needs_review && (
                  <span className="inline-flex items-center gap-1 text-xs text-warning ml-auto">
                    <AlertTriangle className="h-3.5 w-3.5" /> tekshiruv kerak
                  </span>
                )}
              </div>
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-muted">Dvigatel</dt>
                  <dd className="text-text-primary font-medium">{complaint.ai.engine === "llm" ? "LLM" : "Kalit so'z"}</dd>
                </div>
                {complaint.ai.confidence != null && (
                  <div>
                    <div className="flex justify-between mb-1">
                      <dt className="text-text-muted">Ishonch darajasi</dt>
                      <dd className="text-text-primary font-medium">{Math.round(complaint.ai.confidence * 100)}%</dd>
                    </div>
                    <div className="h-1.5 rounded-pill bg-bg-subtle overflow-hidden">
                      <div
                        className="h-full rounded-pill bg-accent"
                        style={{ width: `${Math.round(complaint.ai.confidence * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {complaint.ai.sentiment && (
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Kayfiyat</dt>
                    <dd className="text-text-primary font-medium">{complaint.ai.sentiment}</dd>
                  </div>
                )}
                {complaint.ai.summary && (
                  <div>
                    <dt className="text-text-muted mb-1">Qisqacha mazmun</dt>
                    <dd className="text-text-primary">{complaint.ai.summary}</dd>
                  </div>
                )}
                {complaint.ai.tags && complaint.ai.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {complaint.ai.tags.map((tag) => (
                      <span key={tag} className="text-xs rounded-pill bg-bg-subtle px-2.5 py-1 text-text-secondary">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </dl>
            </Card>
          )}

          <Card>
            <h2 className="text-base font-semibold text-text-primary mb-4">Bo&apos;limga biriktirish</h2>
            {complaint.department && (
              <p className="text-sm text-text-secondary mb-3">
                Hozirgi bo&apos;lim: <strong className="text-text-primary">{complaint.department.name}</strong>
              </p>
            )}
            <Label>Bo&apos;lim</Label>
            <Select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="mb-3">
              <option value="">Tanlanmagan</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.names.uz ?? d.code}
                </option>
              ))}
            </Select>
            <Button onClick={handleAssign} disabled={saving || !selectedDept} variant="secondary" className="w-full">
              Biriktirish
            </Button>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-text-primary mb-2">Rasmiy javob</h2>
            <p className="text-xs text-text-muted mb-3">
              {complaint.ai?.suggested_reply ? "AI taklif qilgan javob — tahrirlab yuborishingiz mumkin." : "Fuqaroga yuboriladigan rasmiy javob."}
            </p>
            <form onSubmit={handleReply} className="flex flex-col gap-3">
              <Textarea rows={4} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Hurmatli fuqaro, ..." />
              <Button type="submit" disabled={saving || !replyText.trim()}>
                <Send className="h-4 w-4" /> Yuborish
              </Button>
            </form>
            {complaint.replies.length > 0 && (
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
                {complaint.replies.map((r) => (
                  <div key={r.id} className="rounded-inner bg-bg-subtle px-4 py-3">
                    <p className="text-sm text-text-primary whitespace-pre-wrap">{r.text}</p>
                    <p className="text-xs text-text-muted mt-1">{new Date(r.sent_at).toLocaleString("uz-UZ")}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
