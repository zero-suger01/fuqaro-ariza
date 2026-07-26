"use client";

import { useTranslations } from "next-intl";
import { ThinkingOrb } from "thinking-orbs";

// Ariza yuborilgan (backend'da ticket allaqachon yaratilgan), lekin AI
// natijasi kutilmoqda — docs/10-ui-ux.md §2.9 "kutish holatlari
// tushuntiriladi" qoidasi bo'yicha sodda kutish ekrani ko'rsatiladi.
// `useAiRouting` (frontend/src/lib/useAiRouting.ts) 20 s dan keyin
// baribir "qabul qilindi" ekraniga o'tkazadi — bu ekran cheksiz osilib
// qolmaydi.
//
// Animatsiya: thinking-orbs kutubxonasining "composing" holati —
// to'lqin-simon ko'p lentali sash effekti (orbs.jakubantalik.com).
export function AnalyzingScreen() {
  const t = useTranslations("wizard.analyzing");

  return (
    <div className="flex flex-col items-center justify-center gap-8 text-center">
      <h1 className="max-w-xs text-[26px] font-bold leading-snug text-text-primary sm:max-w-sm sm:text-[28px]">
        {t("title")}
      </h1>

      <ThinkingOrb state="composing" size={64} aria-label={t("title")} />
    </div>
  );
}
