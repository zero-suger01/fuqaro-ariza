"use client";

import { useState } from "react";
import { BadgeCheck, Check, Copy, Home, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { GuestLinkButton } from "@/components/guest/GuestButton";

// AI natijasi (`useAiRouting`, frontend/src/lib/useAiRouting.ts) bu ekran
// ochilishidan OLDIN kutiladi (AnalyzingScreen) — shuning uchun bu yerda
// faqat yakuniy holat ko'rsatiladi: `department` bo'lsa qaysi bo'limga
// yo'naltirilgani, bo'lmasa (poll 20 s da timeout bo'lgan bo'lsa) umumiy
// statik matn (docs/10-ui-ux.md §2.9).
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
        <div className="rounded-card border-2 border-accent bg-accent-soft px-6 py-6">
          <p className="text-[44px] font-bold tracking-[0.35em] text-text-primary">{ticketNumber}</p>
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

      {/* R0/Q5 — fuqaro AI ishlayotganini biladi (murojaat 1 daqiqada bo'limda).
          Mijoz so'ragan: routing hali noma'lum bo'lsa (department=null,
          20s poll timeout) statik "AI o'qib yo'naltiradi" matni endi
          ko'rsatilmaydi — faqat haqiqiy natija bo'lsa banner chiqadi. */}
      {department && (
        <div className="flex w-full items-start gap-3 rounded-card border-2 border-success bg-success/10 px-4 py-3 text-left">
          <BadgeCheck className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden />
          <p className="text-base text-text-primary">{t("aiRouted", { department })}</p>
        </div>
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
