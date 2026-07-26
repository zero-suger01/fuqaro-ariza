"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

// Ariza yuborilgan (backend'da ticket allaqachon yaratilgan), lekin AI
// natijasi kutilmoqda — docs/10-ui-ux.md §2.9 "kutish holatlari
// tushuntiriladi" qoidasi bo'yicha 3 qadamli progress ko'rsatiladi.
// `useAiRouting` (frontend/src/lib/useAiRouting.ts) 20 s dan keyin
// baribir "qabul qilindi" ekraniga o'tkazadi — bu ekran cheksiz osilib
// qolmaydi.
//
// Kartochka ikki ustunli: 1-ustun — 3 qadamli checklist, 2-ustun —
// sayt ranglariga moslashtirilgan AI "o'ylayapti" animatsiyasi.
export function AnalyzingScreen() {
  const t = useTranslations("wizard.analyzing");

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-[28px] font-bold leading-snug text-text-primary">{t("title")}</h1>
      <p className="text-lg text-text-secondary">{t("subtitle")}</p>

      <div className="flex w-full flex-col items-stretch gap-6 rounded-card bg-bg-surface p-5 text-left shadow-card md:flex-row md:items-center md:gap-4">
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/15">
              <Check className="h-4 w-4 text-success" aria-hidden />
            </span>
            <p className="text-base text-text-primary">{t("step1")}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft">
              <span className="absolute h-7 w-7 animate-ping rounded-full bg-accent/40" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
            </span>
            <p className="text-base font-medium text-text-primary">{t("step2")}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-subtle">
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" aria-hidden />
            </span>
            <p className="text-base text-text-muted">{t("step3")}</p>
          </div>
        </div>
        <div className="flex flex-none items-center justify-center md:w-40">
          <AiThinkingOrb />
        </div>
      </div>
    </div>
  );
}

function AiThinkingOrb() {
  return (
    <div className="relative h-32 w-32" aria-hidden>
      {/* Tashqi nurlanish */}
      <div className="absolute inset-0 rounded-full bg-accent/10 blur-2xl animate-ai-glow" />

      {/* Kengayib ketayotgan halqalar */}
      <div className="absolute inset-2 rounded-full border border-accent/20 animate-pulse-ring" />
      <div className="absolute inset-2 rounded-full border border-navy-600/20 animate-pulse-ring [animation-delay:0.6s]" />

      {/* Markaziy shar */}
      <div className="absolute inset-6 rounded-full bg-gradient-to-br from-navy-600 via-navy-700 to-accent shadow-lg animate-ai-float">
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-accent/30 to-transparent" />
      </div>

      {/* Ichki nur */}
      <div className="absolute inset-8 rounded-full bg-accent/20 blur-md animate-ai-pulse" />

      {/* Aylanib yuruvchi zarralar */}
      <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_8px_rgba(244,154,81,0.8)] animate-orbit" />
      <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-info shadow-[0_0_8px_rgba(61,111,180,0.8)] animate-orbit [animation-delay:-1.3s] [animation-duration:2.6s]" />
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.8)] animate-orbit [animation-delay:-2.1s] [animation-duration:3.4s]" />
    </div>
  );
}
