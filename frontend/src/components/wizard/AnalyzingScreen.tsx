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
// "AI-powered marketing tools abstract") sarlavha qatorining o'ng
// tomonida, katta o'lchamda — mijoz talabi (avval kichik va chapda
// edi, keyin sahifa yuqorisidagi markazdagi katta grafika yoqmagan edi).
export function AnalyzingScreen() {
  const t = useTranslations("wizard.analyzing");

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex-1 text-left">
          <h1 className="text-[28px] font-bold leading-snug text-text-primary">{t("title")}</h1>
          <p className="mt-1 text-lg text-text-secondary">{t("subtitle")}</p>
        </div>
        <div className="h-36 w-36 flex-none">
          <Lottie animationData={aiAnalyzingAnimation} loop autoplay />
        </div>
      </div>

      <div className="flex w-full flex-col gap-4 rounded-card bg-bg-surface p-5 text-left shadow-card">
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
