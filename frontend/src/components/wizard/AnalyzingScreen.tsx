"use client";

import { useEffect, useState } from "react";
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
// 3D card-stack: birinchi qadam oldinda ko'rsatiladi, qolgan ikkitasi
// orqada kutadi. Har 2.5 s dan keyin oldingi karta orqaga aylanib
// ketadi va keyingisi oldinga chiqadi.
const STEP_INTERVAL_MS = 2500;

export function AnalyzingScreen() {
  const t = useTranslations("wizard.analyzing");
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, STEP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const steps = [t("step1"), t("step2"), t("step3")];

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-[28px] font-bold leading-snug text-text-primary">{t("title")}</h1>
      <p className="text-lg text-text-secondary">{t("subtitle")}</p>

      <div className="flex w-full justify-center">
        <div className="relative h-44 w-full max-w-sm [perspective:1000px]">
          {[0, 1, 2].map((index) => (
            <StepCard
              key={index}
              index={index}
              activeStep={activeStep}
              label={steps[index]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StepCard({
  index,
  activeStep,
  label,
}: {
  index: number;
  activeStep: number;
  label: string;
}) {
  const position = (index - activeStep + 3) % 3;

  const transforms: Record<number, string> = {
    0: "rotateY(0deg) translateZ(60px) scale(1)",
    1: "rotateY(22deg) translateZ(0px) scale(0.92)",
    2: "rotateY(44deg) translateZ(-60px) scale(0.84)",
  };

  const opacities: Record<number, string> = {
    0: "1",
    1: "0.55",
    2: "0.3",
  };

  const zIndexes: Record<number, number> = {
    0: 30,
    1: 20,
    2: 10,
  };

  const isFront = position === 0;

  return (
    <div
      className="absolute inset-x-0 top-0 mx-auto flex h-36 w-[90%] items-center gap-4 rounded-card bg-bg-surface p-5 shadow-card transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] [backface-visibility:hidden] [transform-style:preserve-3d]"
      style={{
        transform: transforms[position],
        opacity: opacities[position],
        zIndex: zIndexes[position],
      }}
    >
      <span
        className={[
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
          isFront && index === 0 ? "bg-success/15" : "",
          isFront && index === 1 ? "bg-accent-soft" : "",
          isFront && index === 2 ? "bg-bg-subtle" : "",
          !isFront ? "bg-bg-subtle" : "",
        ].filter(Boolean).join(" ")}
      >
        {isFront && index === 0 && <Check className="h-6 w-6 text-success" aria-hidden />}
        {isFront && index === 1 && (
          <ThinkingOrb state="composing" size={20} aria-label={label} />
        )}
        {isFront && index === 2 && (
          <span className="h-3.5 w-3.5 rounded-full bg-border-strong" aria-hidden />
        )}
        {!isFront && (
          <span className="h-3 w-3 rounded-full bg-border-strong" aria-hidden />
        )}
      </span>

      <p
        className={[
          "text-lg leading-snug",
          isFront ? "font-medium text-text-primary" : "text-text-muted",
        ].filter(Boolean).join(" ")}
      >
        {label}
      </p>
    </div>
  );
}
