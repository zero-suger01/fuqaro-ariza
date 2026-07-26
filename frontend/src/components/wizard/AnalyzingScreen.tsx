"use client";

import { useTranslations } from "next-intl";

// Ariza yuborilgan (backend'da ticket allaqachon yaratilgan), lekin AI
// natijasi kutilmoqda — docs/10-ui-ux.md §2.9 "kutish holatlari
// tushuntiriladi" qoidasi bo'yicha sodda kutish ekrani ko'rsatiladi.
// `useAiRouting` (frontend/src/lib/useAiRouting.ts) 20 s dan keyin
// baribir "qabul qilindi" ekraniga o'tkazadi — bu ekran cheksiz osilib
// qolmaydi.
//
// Animatsiya: loyihaning hujjat-markazli uslubiga mos — fuqaroning
// murojaat hujjatini AI "skanerlab" o'qiyotgani tasvirlangan. Fayl
// kartochkasi ustidan orange skaner nuridan pastga yugurib o'tadi,
// atrofida mayda uchqunlar suzadi.
export function AnalyzingScreen() {
  const t = useTranslations("wizard.analyzing");

  return (
    <div className="flex flex-col items-center justify-center gap-8 text-center">
      <h1 className="max-w-xs text-[26px] font-bold leading-snug text-text-primary sm:max-w-sm sm:text-[28px]">
        {t("title")}
      </h1>

      <div className="relative flex items-center justify-center">
        {/* Uchuvchi uchqunlar */}
        <span className="absolute -left-8 top-4 h-2 w-2 rounded-full bg-[#F49A51] animate-sparkle" aria-hidden />
        <span className="absolute -right-10 top-10 h-1.5 w-1.5 rounded-full bg-[#F49A51]/80 animate-sparkle [animation-delay:0.9s]" aria-hidden />
        <span className="absolute -left-6 bottom-6 h-1.5 w-1.5 rounded-full bg-[#F49A51]/60 animate-sparkle [animation-delay:1.7s]" aria-hidden />
        <span className="absolute -right-7 bottom-2 h-2 w-2 rounded-full bg-navy-600/70 animate-sparkle [animation-delay:0.5s]" aria-hidden />

        {/* Hujjat kartochkasi */}
        <div className="relative w-44 overflow-hidden rounded-card border border-border bg-bg-surface p-5 shadow-card">
          {/* Skaner nuri */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 animate-scan bg-gradient-to-b from-transparent via-[#F49A51]/35 to-transparent" aria-hidden />

          {/* Matn qatorlari (fake content) */}
          <div className="flex flex-col gap-2.5">
            <div className="h-2.5 w-2/3 rounded-full bg-navy-600/25" />
            <div className="h-2 w-full rounded-full bg-border-strong/50" />
            <div className="h-2 w-5/6 rounded-full bg-border-strong/50" />
            <div className="h-2 w-full rounded-full bg-border-strong/50" />
            <div className="h-2 w-3/5 rounded-full bg-border-strong/50" />
            <div className="h-2 w-4/5 rounded-full bg-border-strong/50" />
            <div className="h-2 w-1/2 rounded-full bg-border-strong/50" />
          </div>

          {/* Pastki chekka — skaner yetib kelganda yorishib turadigan "progress" chizig'i */}
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
            <div className="h-full w-1/3 animate-progress rounded-full bg-[#F49A51]" />
          </div>
        </div>
      </div>
    </div>
  );
}
