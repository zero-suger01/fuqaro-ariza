"use client";

import { ArrowLeft, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { clsx } from "clsx";
import { Link } from "@/i18n/navigation";

/** Horizontal step tracker: a checkmark circle per completed step, a
 * highlighted circle for the current one, connected by a line — the
 * horizontal counterpart of the vertical checklist style used elsewhere
 * in the product. */
export function WizardProgress({ step, total = 3 }: { step: number; total?: number }) {
  const t = useTranslations("wizard");

  return (
    <div className="flex items-center gap-4">
      <Link href="/" aria-label={t("back")} className="text-text-secondary">
        <ArrowLeft className="h-6 w-6" aria-hidden />
      </Link>
      <div className="flex flex-1 items-center" aria-label={t("progress", { current: step, total })}>
        {Array.from({ length: total }, (_, i) => {
          const stepNumber = i + 1;
          const isDone = stepNumber < step;
          const isCurrent = stepNumber === step;
          const isLast = i === total - 1;
          return (
            <div key={i} className={clsx("flex items-center", !isLast && "flex-1")}>
              <span
                className={clsx(
                  "flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 text-sm font-semibold",
                  isDone && "border-accent bg-accent text-white",
                  isCurrent && "border-accent bg-bg-surface text-accent",
                  !isDone && !isCurrent && "border-border-strong bg-bg-surface text-text-muted"
                )}
              >
                {isDone ? <Check className="h-4 w-4" aria-hidden /> : stepNumber}
              </span>
              {!isLast && <span className={clsx("h-0.5 flex-1", isDone ? "bg-accent" : "bg-border-strong")} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
