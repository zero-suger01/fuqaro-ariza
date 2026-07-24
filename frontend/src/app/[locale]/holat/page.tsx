"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { GuestShell } from "@/components/guest/GuestShell";
import { GuestButton } from "@/components/guest/GuestButton";
import { GuestTimeline } from "@/components/guest/GuestTimeline";
import { apiGet, ApiError } from "@/lib/api";
import { digitsAfterCountryCode, formatUzPhoneDisplay, isValidUzPhone, toE164 } from "@/lib/phone";
import type { TrackResponse } from "@/lib/types";

function StatusForm() {
  const t = useTranslations("status");
  const searchParams = useSearchParams();

  const [ticket, setTicket] = useState(searchParams.get("ticket") ?? "");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResponse | null>(null);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!ticket.trim() || !isValidUzPhone(phoneDigits)) {
      setError(t("notFound"));
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ ticket: ticket.trim(), phone: toE164(phoneDigits) });
      const response = await apiGet<TrackResponse>(`/api/public/complaints/track?${params.toString()}`);
      setResult(response);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError(t("notFound"));
      } else {
        setError(t("notFound"));
      }
    } finally {
      setLoading(false);
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

          {result.need_info && (
            <div className="rounded-card border-2 border-warning bg-warning/10 p-4">
              <p className="text-lg font-semibold text-warning">{t("needInfoTitle")}</p>
              <p className="text-base text-text-secondary">{t("needInfoText")}</p>
            </div>
          )}

          {result.reply_text && (
            <div className="rounded-card border-2 border-success bg-success/10 p-4">
              <p className="text-lg font-semibold text-success">{t("replyTitle")}</p>
              <p className="text-base text-text-primary">{result.reply_text}</p>
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
