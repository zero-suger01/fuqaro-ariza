"use client";

import { useTranslations } from "next-intl";

// Ariza yuborilgan (backend'da ticket allaqachon yaratilgan), lekin AI
// natijasi kutilmoqda — docs/10-ui-ux.md §2.9 "kutish holatlari
// tushuntiriladi" qoidasi bo'yicha sodda kutish ekrani ko'rsatiladi.
// `useAiRouting` (frontend/src/lib/useAiRouting.ts) 20 s dan keyin
// baribir "qabul qilindi" ekraniga o'tkazadi — bu ekran cheksiz osilib
// qolmaydi.
export function AnalyzingScreen() {
  const t = useTranslations("wizard.analyzing");

  return (
    <div className="flex flex-col items-center justify-center gap-8 text-center">
      <h1 className="max-w-xs text-[26px] font-bold leading-snug text-text-primary sm:max-w-sm sm:text-[28px]">
        {t("title")}
      </h1>

      <div className="relative flex h-44 w-44 items-center justify-center">
        {/* Tashqi nurlanish */}
        <div className="absolute inset-0 rounded-full bg-[#F49A51]/15 blur-3xl animate-ai-glow" />

        {/* Kengayib ketayotgan halqalar */}
        <div className="absolute inset-0 rounded-full border-2 border-[#F49A51]/25 animate-pulse-ring" />
        <div className="absolute inset-0 rounded-full border-2 border-[#F49A51]/20 animate-pulse-ring [animation-delay:0.7s]" />

        {/* Markaziy shar */}
        <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-[#F49A51] via-[#e8863a] to-[#F49A51] shadow-[0_0_40px_rgba(244,154,81,0.45)] animate-ai-breathe">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/25 to-transparent" />
        </div>

        {/* Aylanib yuruvchi zarralar */}
        <span className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F49A51] shadow-[0_0_12px_rgba(244,154,81,0.9)] animate-orbit" />
        <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] animate-orbit [animation-delay:-1.2s] [animation-duration:2.4s]" />
        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F49A51] shadow-[0_0_8px_rgba(244,154,81,0.9)] animate-orbit [animation-delay:-2s] [animation-duration:3.2s]" />
      </div>
    </div>
  );
}
