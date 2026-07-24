"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { clsx } from "clsx";
import { Link } from "@/i18n/navigation";

export function WizardProgress({ step, total = 3 }: { step: number; total?: number }) {
  const t = useTranslations("wizard");

  return (
    <div className="flex items-center gap-4">
      <Link href="/" aria-label={t("back")} className="text-text-secondary">
        <ArrowLeft className="h-6 w-6" aria-hidden />
      </Link>
      <div className="flex items-center gap-2">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={clsx("h-2.5 w-2.5 rounded-full", i < step ? "bg-accent" : "bg-border-strong")}
          />
        ))}
      </div>
      <span className="text-base text-text-muted">{t("progress", { current: step, total })}</span>
    </div>
  );
}
