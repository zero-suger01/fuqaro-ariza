"use client";

import { Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

// Ariza yuborilgan (backend'da ticket allaqachon yaratilgan), lekin AI
// natijasi kutilmoqda — docs/10-ui-ux.md §2.9 "kutish holatlari
// tushuntiriladi" qoidasi bo'yicha 3 qadamli progress ko'rsatiladi.
// `useAiRouting` (frontend/src/lib/useAiRouting.ts) 20 s dan keyin
// baribir "qabul qilindi" ekraniga o'tkazadi — bu ekran cheksiz osilib
// qolmaydi.
export function AnalyzingScreen() {
  const t = useTranslations("wizard.analyzing");

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
        <Sparkles className="h-9 w-9 animate-pulse text-accent" aria-hidden />
      </div>
      <h1 className="text-[28px] font-bold leading-snug text-text-primary">{t("title")}</h1>
      <p className="text-lg text-text-secondary">{t("subtitle")}</p>

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
