"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { ThinkingOrb } from "thinking-orbs";

// Ariza yuborilgan (backend'da ticket allaqachon yaratilgan), lekin AI
// natijasi kutilmoqda — docs/10-ui-ux.md §2.9 "kutish holatlari
// tushuntiriladi" qoidasi bo'yicha 3 qadamli progress ko'rsatiladi.
// `useAiRouting` (frontend/src/lib/useAiRouting.ts) 20 s dan keyin
// baribir "qabul qilindi" ekraniga o'tkazadi — bu ekran cheksiz osilib
// qolmaydi.
//
// Vertikal timeline: har bir qadam chiziq bilan bog'langan, faol qadamda
// thinking-orbs kutish animatsiyasi ("composing") ko'rsatiladi.
export function AnalyzingScreen() {
  const t = useTranslations("wizard.analyzing");

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-[28px] font-bold leading-snug text-text-primary">{t("title")}</h1>
      <p className="text-lg text-text-secondary">{t("subtitle")}</p>

      <div className="flex w-full flex-col items-stretch gap-6 rounded-card bg-bg-surface p-5 text-left shadow-card md:flex-row md:items-start md:gap-8">
        <div className="flex flex-1 flex-col">
          <TimelineStep
            state="done"
            label={t("step1")}
            isLast={false}
          />
          <TimelineStep
            state="active"
            label={t("step2")}
            isLast={false}
          />
          <TimelineStep
            state="pending"
            label={t("step3")}
            isLast={true}
          />
        </div>
        <div className="flex flex-none items-center justify-center md:w-40 md:pt-6">
          <ThinkingOrb state="composing" size={64} aria-label={t("step2")} />
        </div>
      </div>
    </div>
  );
}

function TimelineStep({
  state,
  label,
  isLast,
}: {
  state: "done" | "active" | "pending";
  label: string;
  isLast: boolean;
}) {
  return (
    <div className="relative flex gap-3">
      {/* Chiziq va tugun */}
      <div className="flex flex-col items-center">
        <span
          className={[
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            state === "done" && "bg-success/15",
            state === "active" && "bg-accent-soft",
            state === "pending" && "bg-bg-subtle",
          ].filter(Boolean).join(" ")}
        >
          {state === "done" && <Check className="h-4 w-4 text-success" aria-hidden />}
          {state === "active" && (
            <span className="relative flex h-full w-full items-center justify-center">
              <span className="absolute h-7 w-7 animate-ping rounded-full bg-accent/40" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
            </span>
          )}
          {state === "pending" && (
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong" aria-hidden />
          )}
        </span>
        {!isLast && (
          <span className="mt-1 h-full min-h-[2rem] w-0.5 rounded-full bg-border md:min-h-[2.5rem]" aria-hidden />
        )}
      </div>

      {/* Matn */}
      <div className="pb-6 pt-0.5">
        <p
          className={[
            "text-base",
            state === "done" && "text-text-primary",
            state === "active" && "font-medium text-text-primary",
            state === "pending" && "text-text-muted",
          ].filter(Boolean).join(" ")}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
