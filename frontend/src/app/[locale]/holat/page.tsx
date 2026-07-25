"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@/lib/formatDate";
import { GuestShell } from "@/components/guest/GuestShell";
import { GuestButton } from "@/components/guest/GuestButton";
import { GuestTimeline } from "@/components/guest/GuestTimeline";
import { ImagePicker } from "@/components/wizard/ImagePicker";
import { apiGet, apiPost, apiPostForm, ApiError } from "@/lib/api";
import { digitsAfterCountryCode, formatUzPhoneDisplay, isValidUzPhone, toE164 } from "@/lib/phone";
import type { CitizenInfoResponse, FeedbackResponse, TrackResponse } from "@/lib/types";

function StatusForm() {
  const t = useTranslations("status");
  const locale = useLocale();
  const searchParams = useSearchParams();

  const [ticket, setTicket] = useState(searchParams.get("ticket") ?? "");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResponse | null>(null);

  // v1.4 — qo'shimcha ma'lumot yuborish
  const [infoText, setInfoText] = useState("");
  const [infoImages, setInfoImages] = useState<File[]>([]);
  const [infoSending, setInfoSending] = useState(false);
  const [infoSent, setInfoSent] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  // v1.4 — baho va qayta ochish
  const [complaintNotSolved, setComplaintNotSolved] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackReopened, setFeedbackReopened] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setInfoSent(false);
    setFeedbackDone(false);
    setComplaintNotSolved(false);
    if (!ticket.trim() || !isValidUzPhone(phoneDigits)) {
      setError(t("notFound"));
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ ticket: ticket.trim(), phone: toE164(phoneDigits) });
      const response = await apiGet<TrackResponse>(`/api/public/complaints/track?${params.toString()}`);
      setResult(response);
    } catch {
      // 404 va boshqa xatolar uchun bir xil matn — ticket mavjudligi
      // oshkor qilinmasligi kerak (backend ham shu sababdan 404 beradi).
      setError(t("notFound"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendInfo(e: React.FormEvent) {
    e.preventDefault();
    setInfoError(null);
    if (!infoText.trim()) {
      setInfoError(t("infoEmptyError"));
      return;
    }
    setInfoSending(true);
    try {
      const form = new FormData();
      form.append("ticket", ticket.trim());
      form.append("phone", toE164(phoneDigits));
      form.append("text", infoText.trim());
      infoImages.forEach((file) => form.append("images", file));
      await apiPostForm<CitizenInfoResponse>("/api/public/complaints/info", form);
      setInfoSent(true);
      setInfoText("");
      setInfoImages([]);
    } catch (err) {
      setInfoError(err instanceof ApiError ? err.message : t("notFound"));
    } finally {
      setInfoSending(false);
    }
  }

  async function sendFeedback(satisfied: boolean) {
    setFeedbackError(null);
    setFeedbackSending(true);
    try {
      const response = await apiPost<FeedbackResponse>("/api/public/complaints/feedback", {
        ticket: ticket.trim(),
        phone: toE164(phoneDigits),
        satisfied,
        comment: satisfied ? null : feedbackComment.trim() || null,
      });
      setFeedbackDone(true);
      setFeedbackReopened(response.reopened);
    } catch (err) {
      setFeedbackError(err instanceof ApiError ? err.message : t("notFound"));
    } finally {
      setFeedbackSending(false);
    }
  }

  return (
    <GuestShell>
      <h1 className="text-[28px] font-bold leading-snug text-text-primary">{t("title")}</h1>

      <form onSubmit={handleCheck} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-base font-medium text-text-secondary">{t("ticketLabel")}</label>
          <input
            value={ticket}
            onChange={(e) => setTicket(e.target.value.toUpperCase())}
            placeholder={t("ticketPlaceholder")}
            className="min-h-[56px] w-full rounded-control border-2 border-border-strong bg-bg-surface px-4 text-lg text-text-primary outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-base font-medium text-text-secondary">{t("phoneLabel")}</label>
          <input
            type="tel"
            inputMode="numeric"
            value={formatUzPhoneDisplay(phoneDigits)}
            onChange={(e) => setPhoneDigits(digitsAfterCountryCode(e.target.value))}
            placeholder="+998 (90) 123-45-67"
            className="min-h-[56px] w-full rounded-control border-2 border-border-strong bg-bg-surface px-4 text-lg text-text-primary outline-none focus:border-accent"
          />
        </div>
        {error && <p className="text-base text-danger">{error}</p>}
        <GuestButton type="submit" disabled={loading}>
          {loading ? t("checking") : t("checkButton")}
        </GuestButton>
      </form>

      {result && (
        <div className="flex flex-col gap-5 rounded-card bg-bg-surface p-6 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-text-primary">{result.ticket_number}</p>
            <p className="text-base text-text-secondary">{result.category.name}</p>
          </div>

          <GuestTimeline timeline={result.timeline} />

          {/* R0/Q5: fuqaro "murojaatim QAYERDA va QACHONGACHA" savoliga javob oladi */}
          {(result.department || result.deadline_at) && (
            <div className="rounded-card bg-bg-subtle p-4 flex flex-col gap-1.5">
              {result.department && (
                <p className="text-base text-text-secondary">
                  {t("departmentLabel")}:{" "}
                  <strong className="text-text-primary">{result.department.name}</strong>
                </p>
              )}
              {result.deadline_at && (
                <p className="text-base text-text-secondary">
                  {t("deadlineLabel")}:{" "}
                  <strong className="text-text-primary">{formatDate(result.deadline_at, locale)}</strong>
                </p>
              )}
            </div>
          )}

          {/* v1.4 (docs/10 §10.4): avval bu yerda faqat «qo'ng'iroq
              qilinadi yoki SMS keladi» degan statik banner turardi va
              fuqaro javob qaytara olmasdi — sikl shu yerda uzilib,
              murojaat «Ma'lumot kutilmoqda» da qolib ketardi. */}
          {result.need_info && (
            <div className="rounded-card border-2 border-warning bg-warning/10 p-4 flex flex-col gap-4">
              <div>
                <p className="text-lg font-semibold text-warning">{t("needInfoTitle")}</p>
                <p className="text-base text-text-secondary">{t("needInfoText")}</p>
                {result.info_request_text && (
                  <p className="mt-2 text-lg font-medium text-text-primary">{result.info_request_text}</p>
                )}
              </div>

              {infoSent ? (
                <div className="rounded-card bg-success/10 p-4">
                  <p className="text-lg font-semibold text-success">{t("infoSentTitle")}</p>
                  <p className="text-base text-text-secondary">{t("infoSentText")}</p>
                </div>
              ) : (
                <form onSubmit={handleSendInfo} className="flex flex-col gap-4">
                  {result.info_provided && (
                    <p className="text-base text-text-secondary">{t("infoAlreadySent")}</p>
                  )}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="info-answer" className="text-base font-medium text-text-secondary">
                      {t("infoAnswerLabel")}
                    </label>
                    <textarea
                      id="info-answer"
                      rows={4}
                      value={infoText}
                      onChange={(e) => setInfoText(e.target.value)}
                      className="w-full rounded-control border-2 border-border-strong bg-bg-surface px-4 py-3 text-lg leading-relaxed text-text-primary outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-base font-medium text-text-secondary">{t("infoPhotoLabel")}</span>
                    <ImagePicker images={infoImages} onChange={setInfoImages} />
                  </div>
                  {infoError && <p className="text-base text-danger">{infoError}</p>}
                  <GuestButton type="submit" disabled={infoSending}>
                    {infoSending ? t("infoSending") : t("infoSendButton")}
                  </GuestButton>
                </form>
              )}
            </div>
          )}

          {result.reply_text && (
            <div className="rounded-card border-2 border-success bg-success/10 p-4">
              <p className="text-lg font-semibold text-success">{t("replyTitle")}</p>
              <p className="text-base text-text-primary">{result.reply_text}</p>
            </div>
          )}

          {/* v1.4 (docs/03 §3.6): fuqaroning yagona e'tiroz kanali.
              Usiz «hal qilindi» yorlig'i oxirgi so'z bo'lib qolardi. */}
          {(result.can_give_feedback || result.satisfaction != null || feedbackDone) && (
            <div className="rounded-card border-2 border-border-strong bg-bg-subtle p-4 flex flex-col gap-4">
              <p className="text-lg font-semibold text-text-primary">{t("feedbackTitle")}</p>

              {feedbackDone ? (
                <div>
                  <p className="text-base text-text-primary">{t("feedbackThanks")}</p>
                  {feedbackReopened && (
                    <p className="mt-1 text-base font-medium text-warning">{t("feedbackReopened")}</p>
                  )}
                </div>
              ) : result.satisfaction != null ? (
                <p className="text-base text-text-secondary">
                  {result.satisfaction ? t("feedbackGivenYes") : t("feedbackGivenNo")}
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    <GuestButton type="button" disabled={feedbackSending} onClick={() => sendFeedback(true)}>
                      {t("feedbackYes")}
                    </GuestButton>
                    {complaintNotSolved ? (
                      <div className="flex flex-col gap-2">
                        <label htmlFor="feedback-comment" className="text-base font-medium text-text-secondary">
                          {t("feedbackCommentLabel")}
                        </label>
                        <textarea
                          id="feedback-comment"
                          rows={3}
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          className="w-full rounded-control border-2 border-border-strong bg-bg-surface px-4 py-3 text-lg leading-relaxed text-text-primary outline-none focus:border-accent"
                        />
                        <GuestButton type="button" disabled={feedbackSending} onClick={() => sendFeedback(false)}>
                          {feedbackSending ? t("infoSending") : t("feedbackSend")}
                        </GuestButton>
                      </div>
                    ) : (
                      <GuestButton type="button" variant="secondary" onClick={() => setComplaintNotSolved(true)}>
                        {t("feedbackNo")}
                      </GuestButton>
                    )}
                  </div>
                  {feedbackError && <p className="text-base text-danger">{feedbackError}</p>}
                </>
              )}
            </div>
          )}

          {result.rejected_reason && (
            <div className="rounded-card border-2 border-danger bg-danger/10 p-4">
              <p className="text-lg font-semibold text-danger">{t("rejectedTitle")}</p>
              <p className="text-base text-text-primary">{result.rejected_reason}</p>
            </div>
          )}
        </div>
      )}
    </GuestShell>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={null}>
      <StatusForm />
    </Suspense>
  );
}
