"use client";

import { useState } from "react";
import { BadgeCheck, Check, Copy, Home, Search, Ticket } from "lucide-react";
import { useTranslations } from "next-intl";
import { GuestLinkButton } from "@/components/guest/GuestButton";

// AI natijasi (`useAiRouting`, frontend/src/lib/useAiRouting.ts) bu ekran
// ochilishidan OLDIN kutiladi (AnalyzingScreen) — shuning uchun bu yerda
// faqat yakuniy holat ko'rsatiladi: `department` bo'lsa qaysi bo'limga
// yo'naltirilgani, bo'lmasa (poll 20 s da timeout bo'lgan bo'lsa) umumiy
// statik matn (docs/10-ui-ux.md §2.9).

/** Renders the ticket number as individual LED-style digit tiles, each
 * popping in with a short stagger (globals.css @keyframes digit-in) — the
 * "bank queue display" look the client asked for, instead of a single
 * static block of text. */
function TicketDigits({ value }: { value: string }) {
  return (
    <div className="flex justify-center gap-1.5">
      {value.split("").map((digit, i) => (
        <span
          key={i}
          className="flex h-14 w-9 items-center justify-center rounded-inner bg-navy-900 font-mono text-[28px] font-bold text-accent shadow-[0_0_14px_rgba(244,154,81,0.35)]"
          style={{ animation: "digit-in 0.35s ease-out backwards", animationDelay: `${i * 70}ms` }}
        >
          {digit}
        </span>
      ))}
    </div>
  );
}

export function SuccessScreen({ ticketNumber, department }: { ticketNumber: string; department: string | null }) {
  const t = useTranslations("wizard.success");
  const [copied, setCopied] = useState(false);

  async function copyTicket() {
    try {
      await navigator.clipboard.writeText(ticketNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — no-op, the number is already on screen
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
        <Check className="h-9 w-9 text-success" aria-hidden />
      </div>
      <h1 className="text-[28px] font-bold leading-snug text-text-primary">{t("title")}</h1>

      <div className="flex w-full flex-col gap-3">
        {/* "Bank navbat" ticket stub: header on a light surface, a dashed
         * tear-line with punched-out side notches, then the LED number
         * board on a dark strip — mirrors a physical queue ticket. */}
        <div className="w-full overflow-hidden rounded-card bg-bg-surface shadow-lift">
          <div className="flex flex-col items-center gap-2 px-6 pt-6 pb-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft">
              <Ticket className="h-5 w-5 text-accent" aria-hidden />
            </span>
            <p className="text-sm font-semibold uppercase tracking-widest text-text-muted">{t("ticketLabel")}</p>
          </div>

          <div className="relative border-t-2 border-dashed border-border">
            <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-bg-app" aria-hidden />
            <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-bg-app" aria-hidden />
          </div>

          <div className="bg-navy-900 px-6 py-6">
            <TicketDigits value={ticketNumber} />
          </div>
        </div>

        <button
          type="button"
          onClick={copyTicket}
          className="flex items-center justify-center gap-2 text-lg text-accent underline underline-offset-4"
        >
          <Copy className="h-5 w-5" aria-hidden />
          {copied ? t("copied") : t("copyButton")}
        </button>
      </div>

      <div className="flex flex-col gap-1 text-lg text-text-secondary">
        <p>{t("screenshotNote")}</p>
        <p>{t("smsNote")}</p>
      </div>

      {/* R0/Q5 — fuqaro AI ishlayotganini biladi (murojaat 1 daqiqada bo'limda) */}
      {department ? (
        <div className="flex w-full items-start gap-3 rounded-card border-2 border-success bg-success/10 px-4 py-3 text-left">
          <BadgeCheck className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden />
          <p className="text-base text-text-primary">{t("aiRouted", { department })}</p>
        </div>
      ) : (
        <p className="w-full rounded-card bg-bg-subtle px-4 py-3 text-base text-text-secondary">{t("aiNote")}</p>
      )}

      <div className="flex w-full flex-col gap-3">
        <GuestLinkButton href={`/holat?ticket=${encodeURIComponent(ticketNumber)}`} variant="primary">
          <Search className="h-6 w-6" aria-hidden />
          {t("checkStatusButton")}
        </GuestLinkButton>
        <GuestLinkButton href="/" variant="secondary">
          <Home className="h-6 w-6" aria-hidden />
          {t("homeButton")}
        </GuestLinkButton>
      </div>
    </div>
  );
}
