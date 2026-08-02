"use client";

import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { clsx } from "clsx";
import { formatDate } from "@/lib/formatDate";
import type { TimelineStep } from "@/lib/types";

export function GuestTimeline({ timeline }: { timeline: TimelineStep[] }) {
  const t = useTranslations("status.steps");
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-0">
      {timeline.map((step, i) => {
        return (
          <div key={step.step} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  "flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold",
                  step.done
                    ? "bg-accent text-accent-contrast"
                    : "border-2 border-border-strong bg-bg-surface text-text-muted"
                )}
              >
                {step.done ? <Check className="h-5 w-5" aria-hidden /> : null}
              </div>
              {i < timeline.length - 1 && (
                <div className={clsx("w-0.5 flex-1 min-h-[24px]", step.done ? "bg-accent" : "bg-border")} />
              )}
            </div>
            <div className="flex flex-col gap-0.5 pb-6">
              <p className={clsx("text-lg", step.done ? "font-semibold text-text-primary" : "text-text-muted")}>
                {t(step.step)}
              </p>
              {step.at && <p className="text-base text-text-secondary">{formatDate(step.at, locale)}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
