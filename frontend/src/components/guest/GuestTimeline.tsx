"use client";

import { useLocale, useTranslations } from "next-intl";
import { clsx } from "clsx";
import { formatDate } from "@/lib/formatDate";
import type { TimelineStep } from "@/lib/types";
import { GirihStar } from "@/components/motifs";

/**
 * The journey rendered as a rail: completed nodes carry a girih star, the
 * rail between them is gilded up to the point the request has actually
 * reached, and everything ahead stays quiet.
 */
export function GuestTimeline({ timeline }: { timeline: TimelineStep[] }) {
  const t = useTranslations("status.steps");
  const locale = useLocale();
  const lastDone = timeline.reduce((last, step, i) => (step.done ? i : last), -1);

  return (
    <div className="flex flex-col gap-0">
      {timeline.map((step, i) => {
        const isCurrent = i === lastDone;
        const railDone = i < lastDone;

        return (
          <div key={step.step} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  "flex h-9 w-9 flex-none items-center justify-center rounded-full",
                  isCurrent
                    ? "bg-brass shadow-gild"
                    : step.done
                      ? "bg-accent"
                      : "border-2 border-border-strong bg-bg-surface"
                )}
              >
                {step.done ? (
                  <GirihStar size={16} color="#FFFFFF" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-text-muted/60" />
                )}
              </div>
              {i < timeline.length - 1 && (
                <div
                  className={clsx(
                    "min-h-[26px] w-[3px] flex-1 rounded-full",
                    railDone ? "bg-linear-to-b from-accent to-brass" : "bg-border"
                  )}
                />
              )}
            </div>
            <div className="flex flex-col gap-0.5 pb-6">
              <p className={clsx("text-lg", step.done ? "font-bold text-text-primary" : "text-text-muted")}>
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
