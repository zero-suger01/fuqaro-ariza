"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  CheckCircle2,
  HandPlatter,
  Image as ImageIcon,
  MessageCircleQuestion,
  MessageSquare,
  Network,
  Send,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
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
  CITIZEN_INFO_SOURCE_LABELS,
  EVENT_LABELS,
  SUBTASK_STATUS_LABELS,
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
  // v1.4: `need_info` uchun savol matni — bo'sh bo'lsa yuborilmaydi
  // (backend ham 422 beradi, lekin foydalanuvchi buni tugmadan biladi).
  const [infoQuestion, setInfoQuestion] = useState<string | null>(null);
  const [citizenInfo, setCitizenInfo] = useState("");
  const [subtaskDept, setSubtaskDept] = useState("");
  const [subtaskNote, setSubtaskNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiGet<ComplaintDetail>(`/api/admin/complaints/${id}`).then((c) => {
      setComplaint(c);
      setReplyText((prev) => prev || c.ai?.suggested_reply || "");
    });
  }

  useEffect(() => {
    if (user?.role !== "district_admin") return;
    load();
    apiGet<DepartmentAdmin[]>("/api/admin/departments").then(setDepartments).catch(() => setDepartments([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.role]);

  // v1.4: avtomatik `accepted` OLIB TASHLANDI. Sahifani ochish «ko'rdim»
  // degani, «qabul qildim» degani emas — u SLA va birinchi-harakat
  // ko'rsatkichini sun'iy yaxshilardi, mas'ul xodimni esa aniqlamasdi
  // (docs/03 §2.1). O'rniga pastdagi «Qabul qilaman» tugmasi.
  async function handleClaim() {
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/admin/complaints/${id}/claim`, {});
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!subtaskDept || !subtaskNote.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/admin/complaints/${id}/subtasks`, {
        department_id: subtaskDept,
        note: subtaskNote,
      });
      setSubtaskDept("");
      setSubtaskNote("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseSubtask(subtaskId: string) {
    setSaving(true);
    setError(null);
    try {
      await apiPatch(`/api/admin/subtasks/${subtaskId}`, { status: "done" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  async function handleRecordCitizenInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!citizenInfo.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/admin/complaints/${id}/citizen-info`, { text: citizenInfo });
      setCitizenInfo("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  // R2/Q2: asosiy harakat — javobni tasdiqlab, hal qilindi (bitta bosish).
  // assigned/accepted'dan avval in_progress'ga o'tiladi (state machine),
  // keyin resolved + reply_text bitta so'rovda (backend javobni ham yozadi).
  async function handleResolveWithReply() {
    if (!complaint || !replyText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (complaint.status === "assigned" || complaint.status === "accepted") {
        await apiPatch(`/api/admin/complaints/${id}/status`, { status: "in_progress" });
      }
      await apiPatch(`/api/admin/complaints/${id}/status`, { status: "resolved", reply_text: replyText });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: ComplaintStatus, note?: string) {
    setSaving(true);
    setError(null);
    try {
      await apiPatch(`/api/admin/complaints/${id}/status`, { status, note });
      setRejectReason(null);
      setInfoQuestion(null);
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

  async function handleReply() {
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
      <AppShell title="Murojaat tafsiloti" requireRoles={["district_admin"]}>
        <div className="py-10 text-center text-text-muted text-sm">Yuklanmoqda...</div>
      </AppShell>
    );
  }

  const roleAllowed = ROLE_ALLOWED_STATUSES[user?.role ?? ""];
  const allowedTargets = (STATUS_TRANSITIONS[complaint.status] ?? [])
    .filter((s) => s !== "assigned") // assignment happens via the biriktirish card, not a raw status button
    .filter((s) => s !== "accepted") // v1.4: alohida «Qabul qilaman» tugmasi orqali
    .filter((s) => s !== "resolved") // R2: hal qilish faqat AI kartadagi asosiy tugma orqali (javob majburiy)
    .filter((s) => roleAllowed === null || roleAllowed === undefined || roleAllowed.includes(s));

  const canResolve =
    ["assigned", "accepted", "in_progress"].includes(complaint.status) &&
    (roleAllowed == null || roleAllowed.includes("resolved"));

  // «Qabul qilaman» faqat o'z bo'limi xodimiga va faqat hali qabul
  // qilinmagan murojaatga ko'rinadi (docs/03 §2.1).
  const isOwnDepartment =
    user?.role === "department_staff" && complaint.department != null && user.department_id === complaint.department.id;
  const canClaim = isOwnDepartment && complaint.status === "assigned" && complaint.assigned_user_id == null;
  const isMine = complaint.assigned_user_id != null && complaint.assigned_user_id === user?.id;
  const openSubtasks = complaint.subtasks.filter((s) => s.status === "open");

  // v1.8 — AI chegara tufayli ajratmagan xizmatlar nomi. Bir murojaat
  // qayta tahlil qilinsa bir nechta `subtasks_truncated` eventi bo'lishi
  // mumkin, shuning uchun hammasi birlashtiriladi va takrorlanmaydi.
  const unassignedServices = Array.from(
    new Set(
      complaint.events
        .filter((e) => e.event_type === "subtasks_truncated")
        .flatMap((e) => (e.payload?.not_assigned as string[] | undefined) ?? [])
    )
  );

  const images = complaint.files.filter((f) => f.kind === "image");
  const audioFiles = complaint.files.filter((f) => f.kind === "audio");
  const otherFiles = complaint.files.filter((f) => f.kind !== "image" && f.kind !== "audio");

  return (
    <AppShell title={`Murojaat ${complaint.ticket_number}`} requireRoles={["district_admin"]}>
      {error && (
        <div className="rounded-inner bg-danger/10 text-danger text-sm px-4 py-3">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {(images.length > 0 || otherFiles.length > 0) && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="h-4 w-4 text-accent" />
                <h2 className="text-base font-semibold text-text-primary">Media</h2>
              </div>
              {images.length > 0 && (
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
              )}
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
                      🎥 {f.kind} faylni ochish
                    </a>
                  ))}
                </div>
              )}
            </Card>
          )}

          {audioFiles.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <span aria-hidden>🎵</span>
                <h2 className="text-base font-semibold text-text-primary">Ovozli xabar</h2>
              </div>
              <div className="flex flex-col gap-4">
                {audioFiles.map((f) => (
                  <div key={f.id} className="flex flex-col gap-2">
                    <audio controls src={f.url} className="w-full" />
                    {f.transcript ? (
                      <p className="text-sm text-text-secondary rounded-inner bg-bg-subtle border border-border px-3 py-2">
                        {f.transcript}
                      </p>
                    ) : (
                      <p className="text-xs text-text-muted italic">Matnga aylantirilmoqda yoki hali tayyor emas</p>
                    )}
                  </div>
                ))}
              </div>
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

          {/* v1.4 — `need_info` sikli. Avval bu oqim bir tomonlama edi:
              xodim «ma'lumot kutilmoqda» qo'yardi, fuqaro esa javob
              qaytara olmasdi va murojaat shu ustunda qolib ketardi. */}
          <Card className={complaint.status === "need_info" ? "border-2 border-warning" : undefined}>
            <div className="flex items-center gap-2 mb-4">
              <MessageCircleQuestion className="h-4 w-4 text-accent" />
              <h2 className="text-base font-semibold text-text-primary">Fuqaro bilan ma&apos;lumot almashish</h2>
            </div>

            {complaint.status === "need_info" && (
              <div className="rounded-inner bg-warning/10 px-4 py-3 mb-4">
                <p className="text-xs font-semibold text-warning uppercase">So&apos;ralgan ma&apos;lumot</p>
                <p className="text-sm text-text-primary mt-1">
                  {complaint.info_request_text ?? "(savol matni saqlanmagan)"}
                </p>
                {complaint.info_requested_at && (
                  <p className="text-xs text-text-muted mt-1">
                    {new Date(complaint.info_requested_at).toLocaleString("uz-UZ")} dan beri kutilmoqda
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              {complaint.citizen_messages.length === 0 ? (
                <p className="text-sm text-text-muted">Fuqarodan hozircha qo&apos;shimcha ma&apos;lumot kelmagan</p>
              ) : (
                complaint.citizen_messages
                  .slice()
                  .reverse()
                  .map((m) => (
                    <div key={m.id} className="rounded-inner bg-bg-subtle px-4 py-3">
                      <p className="text-sm text-text-primary whitespace-pre-wrap">{m.text}</p>
                      <p className="text-xs text-text-muted mt-1">
                        {CITIZEN_INFO_SOURCE_LABELS[m.source] ?? m.source}
                        {m.recorded_by_name ? ` (${m.recorded_by_name})` : ""} ·{" "}
                        {new Date(m.created_at).toLocaleString("uz-UZ")}
                      </p>
                    </div>
                  ))
              )}
            </div>

            {!["closed", "rejected", "archived"].includes(complaint.status) && (
              <form onSubmit={handleRecordCitizenInfo} className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                <Label>Fuqaro telefonda aytganini yozib qo&apos;yish</Label>
                <Textarea
                  rows={2}
                  value={citizenInfo}
                  onChange={(e) => setCitizenInfo(e.target.value)}
                  placeholder="Fuqaro bilan gaplashdim: uy raqami 12, muammo uch kundan beri..."
                />
                <p className="text-xs text-text-muted">
                  Bu holatni o&apos;zgartirmaydi — fuqaro javob berganiga siz guvoh bo&apos;lganingiz uchun
                  «Ijroda» ga qaytarishni ham o&apos;zingiz bosasiz.
                </p>
                <Button type="submit" variant="secondary" disabled={saving || !citizenInfo.trim()} className="self-start">
                  <Send className="h-4 w-4" /> Yozib qo&apos;yish
                </Button>
              </form>
            )}
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
              {/* v1.4: mas'ul xodim doim ko'rinadi — «kim javobgar»
                  savoliga javob bermaydigan navbat boshqarilmaydi. */}
              <div className="flex justify-between">
                <dt className="text-text-muted">Mas&apos;ul xodim</dt>
                <dd className={complaint.assigned_user_name ? "text-text-primary font-medium" : "text-warning font-medium"}>
                  {complaint.assigned_user_name ?? "Egasi yo'q"}
                  {isMine && " (siz)"}
                </dd>
              </div>
              {complaint.reopened_count > 0 && (
                <div className="flex justify-between">
                  <dt className="text-text-muted">Qayta ochilgan</dt>
                  <dd className="text-danger font-medium">{complaint.reopened_count} marta</dd>
                </div>
              )}
              {complaint.rejected_reason && (
                <div>
                  <dt className="text-text-muted">Rad etish sababi</dt>
                  <dd className="text-danger font-medium">{complaint.rejected_reason}</dd>
                </div>
              )}
            </dl>

            {canClaim && (
              <div className="pt-3 border-t border-border">
                <Button className="w-full" disabled={saving} onClick={handleClaim}>
                  <HandPlatter className="h-4 w-4" /> Qabul qilaman
                </Button>
                <p className="text-xs text-text-muted mt-2">
                  Murojaat sizga biriktiriladi va «Bo&apos;lim qabul qildi» holatiga o&apos;tadi.
                </p>
              </div>
            )}

            {openSubtasks.length > 0 && (
              <p className="mt-3 text-xs text-warning">
                {openSubtasks.length} ta idoralararo topshiriq ochiq — ular yopilmaguncha murojaatni hal
                qilindi deb belgilash mumkin emas.
              </p>
            )}

            {allowedTargets.length > 0 && (
              <div className="flex flex-col gap-2 pt-3 border-t border-border">
                {allowedTargets.map((target) =>
                  target === "need_info" ? (
                    <div key={target} className="flex flex-col gap-2">
                      {infoQuestion !== null ? (
                        <>
                          <Textarea
                            rows={3}
                            value={infoQuestion}
                            onChange={(e) => setInfoQuestion(e.target.value)}
                            placeholder="Fuqarodan nima kerak? Masalan: uy raqamini va muammo qachondan boshlanganini yozing"
                          />
                          <p className="text-xs text-text-muted">
                            Bu matn fuqaroga SMS/Telegram orqali yuboriladi va holat sahifasida ko&apos;rinadi.
                          </p>
                          <Button
                            variant="secondary"
                            disabled={saving || !infoQuestion.trim()}
                            onClick={() => changeStatus("need_info", infoQuestion)}
                          >
                            Savolni yuborish
                          </Button>
                        </>
                      ) : (
                        <Button variant="secondary" disabled={saving} onClick={() => setInfoQuestion("")}>
                          {STATUS_LABELS.need_info}
                        </Button>
                      )}
                    </div>
                  ) : target === "rejected" ? (
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

          {/* R2/Q2 — asosiy ish kartasi: AI xulosasi + tayyor javob + bir
              bosishli hal qilish. order-first — o'ng ustunda eng tepada. */}
          <Card className={`order-first ${complaint.needs_review ? "border-2 border-warning" : "border border-accent/40"}`}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-accent" />
              <h2 className="text-base font-semibold text-text-primary">AI xulosasi va javob</h2>
              {complaint.needs_review && (
                <span className="inline-flex items-center gap-1 text-xs text-warning ml-auto">
                  <AlertTriangle className="h-3.5 w-3.5" /> tekshiruv kerak
                </span>
              )}
            </div>

            {complaint.ai ? (
              <dl className="flex flex-col gap-3 text-sm mb-4">
                {complaint.ai.summary && (
                  <div>
                    <dt className="text-text-muted mb-1">Qisqacha mazmun</dt>
                    <dd className="text-text-primary">{complaint.ai.summary}</dd>
                  </div>
                )}
                {complaint.ai.confidence != null && (
                  <div>
                    <div className="flex justify-between mb-1">
                      <dt className="text-text-muted">
                        Ishonch ({complaint.ai.engine === "llm" ? "LLM" : "Kalit so'z"})
                      </dt>
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
            ) : (
              <p className="text-sm text-text-muted mb-4">AI tahlili hali tayyor emas — javobni o&apos;zingiz yozing.</p>
            )}

            {!["closed", "rejected", "archived"].includes(complaint.status) && (
              <div className="flex flex-col gap-3 pt-3 border-t border-border">
                <p className="text-xs text-text-muted">
                  {complaint.ai?.suggested_reply
                    ? "AI tayyorlagan javob — tahrirlab tasdiqlang."
                    : "Fuqaroga yuboriladigan rasmiy javob."}
                </p>
                <Textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Hurmatli fuqaro, ..."
                />
                {canResolve && (
                  <Button onClick={handleResolveWithReply} disabled={saving || !replyText.trim()}>
                    <CheckCircle2 className="h-4 w-4" /> Javobni tasdiqlab, hal qilindi
                  </Button>
                )}
                {complaint.status !== "resolved" && (
                  <Button
                    variant="secondary"
                    onClick={handleReply}
                    disabled={saving || !replyText.trim()}
                  >
                    <Send className="h-4 w-4" /> Faqat javobni yuborish
                  </Button>
                )}
              </div>
            )}

            {complaint.replies.length > 0 && (
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-text-muted uppercase">Yuborilgan javoblar</p>
                {complaint.replies.map((r) => (
                  <div key={r.id} className="rounded-inner bg-bg-subtle px-4 py-3">
                    <p className="text-sm text-text-primary whitespace-pre-wrap">{r.text}</p>
                    <p className="text-xs text-text-muted mt-1">{new Date(r.sent_at).toLocaleString("uz-UZ")}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {["district_admin", "system_admin"].includes(user?.role ?? "") && (
            <Card>
              <h2 className="text-base font-semibold text-text-primary mb-4">Bo&apos;limga biriktirish / qayta yo&apos;naltirish</h2>
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
          )}

          {/* S2 — idoralararo topshiriqlar: bitta murojaat, bir necha
              bajaruvchi, fuqaroga esa BITTA umumiy javob (docs/03 §5). */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Network className="h-4 w-4 text-accent" />
              <h2 className="text-base font-semibold text-text-primary">Idoralararo topshiriqlar</h2>
            </div>

            {/* v1.8 — AI topgan, lekin chegara (`MAX_AI_SUBTASKS`=3)
                tufayli avtomatik ajratilMAGAN xizmatlar ([07] §1.1).
                Ataylab AYNAN shu kartada: pastdagi «Qo'shimcha bo'lim»
                formasi — buni tuzatadigan joy, ya'ni ogohlantirish va
                harakat bir joyda turadi. Manba `events`, chunki tafsilot
                javobida `ai` boshqa sxema (`AiAnalysisItem`). */}
            {unassignedServices.length > 0 && (
              <div className="mb-4 flex flex-col gap-2 rounded-inner border border-danger/30 bg-danger/5 px-4 py-3">
                {/* Matn shablon satri sifatida beriladi, JSX ichida
                    yozilmaydi: `AI yana {son} ta ...` ko'rinishida yozilsa
                    va qator o'ralsa, JSX ifoda yonidagi bo'shliqni yeb
                    yuboradi va matn «1ta» bo'lib qoladi (tekshirilgan:
                    DOM'da uch tugun — "AI yana ", "1", "ta xizmat...").
                    Vizual `gap` tufayli bu bilinmaydi, lekin skrinrider
                    «bir ta» deb o'qiydi. */}
                <p className="flex items-center gap-1.5 text-sm font-semibold text-danger">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{`AI yana ${unassignedServices.length} ta xizmat aniqladi, lekin o'zi ajratmadi`}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {unassignedServices.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center rounded-pill bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger"
                    >
                      {name}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-text-secondary">
                  Fuqaro bu muammolarni ham yozgan — quyidagi forma orqali tegishli bo&apos;limga
                  topshiriq bering, aks holda ular hech kimda qolmaydi.
                </p>
              </div>
            )}

            {complaint.subtasks.length === 0 ? (
              <p className="text-sm text-text-muted">Topshiriq berilmagan</p>
            ) : (
              <div className="flex flex-col gap-2">
                {complaint.subtasks.map((s) => (
                  <div key={s.id} className="rounded-inner border border-border px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-text-primary">{s.department_name}</span>
                      <Badge
                        label={SUBTASK_STATUS_LABELS[s.status]}
                        color={s.status === "open" ? "var(--warning)" : "var(--success)"}
                      />
                    </div>
                    {s.created_by_ai && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-accent">
                        <Sparkles className="h-3 w-3" /> AI aniqladi
                      </span>
                    )}
                    <p className="text-sm text-text-secondary mt-1">{s.note}</p>
                    {s.status === "open" && (["district_admin", "system_admin"].includes(user?.role ?? "") || user?.department_id === s.department_id) && (
                      <Button
                        variant="secondary"
                        className="mt-2"
                        disabled={saving}
                        onClick={() => handleCloseSubtask(s.id)}
                      >
                        Bajarildi
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {["district_admin", "system_admin"].includes(user?.role ?? "") && !["closed", "rejected", "archived"].includes(complaint.status) && (
              <form onSubmit={handleCreateSubtask} className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                <Label>Qo&apos;shimcha bo&apos;lim</Label>
                <Select value={subtaskDept} onChange={(e) => setSubtaskDept(e.target.value)}>
                  <option value="">Tanlanmagan</option>
                  {departments
                    .filter((d) => d.id !== complaint.department?.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.names.uz ?? d.code}
                      </option>
                    ))}
                </Select>
                <Textarea
                  rows={2}
                  value={subtaskNote}
                  onChange={(e) => setSubtaskNote(e.target.value)}
                  placeholder="Nima qilinishi kerak? Masalan: drenaj quvurini tekshirish"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={saving || !subtaskDept || !subtaskNote.trim()}
                >
                  Topshiriq berish
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
