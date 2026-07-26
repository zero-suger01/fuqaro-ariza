"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import Lottie from "lottie-react";
import aiAnalyzingAnimation from "@/lib/lottie/ai-analyzing.json";

// Ariza yuborilgan (backend'da ticket allaqachon yaratilgan), lekin AI
// natijasi kutilmoqda — docs/10-ui-ux.md §2.9 "kutish holatlari
// tushuntiriladi" qoidasi bo'yicha 3 qadamli progress ko'rsatiladi.
// `useAiRouting` (frontend/src/lib/useAiRouting.ts) 20 s dan keyin
// baribir "qabul qilindi" ekraniga o'tkazadi — bu ekran cheksiz osilib
// qolmaydi.
//
// Lottie animatsiyasi (src/lib/lottie/ai-analyzing.json, mijoz bergan
// "AI-powered marketing tools abstract") checklist kartochkasining
// ICHIDA, o'ng tomonda — mijoz talabi (markazda emas, kartochkaning
// o'ng burchagida turishi kerak).
export function AnalyzingScreen() {
  const t = useTranslations("wizard.analyzing");

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-[28px] font-bold leading-snug text-text-primary">{t("title")}</h1>
      <p className="text-lg text-text-secondary">{t("subtitle")}</p>

      <div className="flex w-full flex-col gap-4 rounded-card bg-bg-surface p-5 text-left shadow-card">
        <div className="ml-auto h-32 w-32">
          <Lottie animationData={aiAnalyzingAnimation} loop autoplay />
        </div>

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
    </div>
  );
}
