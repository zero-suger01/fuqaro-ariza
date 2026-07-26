"use client";

import { useTranslations } from "next-intl";
import { AiComposingOrb } from "@/components/wizard/AiComposingOrb";

// Ariza yuborilgan (backend'da ticket allaqachon yaratilgan), lekin AI
// natijasi kutilmoqda — docs/10-ui-ux.md §2.9 "kutish holatlari
// tushuntiriladi" qoidasi bo'yicha sodda kutish ekrani ko'rsatiladi.
// `useAiRouting` (frontend/src/lib/useAiRouting.ts) 20 s dan keyin
// baribir "qabul qilindi" ekraniga o'tkazadi — bu ekran cheksiz osilib
// qolmaydi.
//
// Animatsiya: AiComposingOrb — thinking-orbs "composing" effektining
// 300px, accent (#F49A51) rangli canvas nusxasi.
export function AnalyzingScreen() {
  const t = useTranslations("wizard.analyzing");

  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center">
      <h1 className="max-w-xs text-lg leading-snug text-text-secondary sm:max-w-sm">
        {t("title")}
      </h1>

      <AiComposingOrb size={300} ariaLabel={t("title")} />
    </div>
  );
}
