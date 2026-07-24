"use client";

import { useState } from "react";
import { Check, Copy, Home, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { GuestLinkButton } from "@/components/guest/GuestButton";

export function SuccessScreen({ ticketNumber }: { ticketNumber: string }) {
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
        <p className="text-lg text-text-secondary">{t("ticketLabel")}</p>
        <div className="rounded-card border-2 border-accent bg-accent-soft px-6 py-5">
          <p className="text-[36px] font-bold tracking-wide text-text-primary">{ticketNumber}</p>
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
