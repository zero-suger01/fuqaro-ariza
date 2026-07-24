"use client";

import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { clsx } from "clsx";
import type { TimelineStep } from "@/lib/types";

// Intl's "uz-UZ"/"oz-UZ" ICU data is incomplete in most runtimes (falls back
// to "M07" instead of a month name), so uz/oz format manually per
// docs/10-ui-ux.md §9 ("24-iyul, 09:30"); ru/en use Intl, which is reliable.
const UZ_MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];
const OZ_MONTHS = [
  "январ", "феврал", "март", "апрел", "май", "июн",
  "июл", "август", "сентябр", "октябр", "ноябр", "декабр",
];

function tashkentParts(iso: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tashkent",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(dtf.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return { day: parts.day, month: Number(parts.month), hour: parts.hour, minute: parts.minute };
}

function formatDate(iso: string, locale: string): string {
  const { day, month, hour, minute } = tashkentParts(iso);
  if (locale === "ru") {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tashkent",
    });
  }
  if (locale === "en") {
    return new Date(iso).toLocaleString("en-US", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tashkent",
    });
  }
  const monthName = locale === "oz" ? OZ_MONTHS[month - 1] : UZ_MONTHS[month - 1];
  return `${day}-${monthName}, ${hour}:${minute}`;
}

export function GuestTimeline({ timeline }: { timeline: TimelineStep[] }) {
  const t = useTranslations("status.steps");
  const locale = useLocale();
  const lastDoneIndex = timeline.reduce((acc, step, i) => (step.done ? i : acc), -1);

  return (
    <div className="flex flex-col gap-0">
      {timeline.map((step, i) => {
        const isCurrent = i === lastDoneIndex && i < timeline.length - 1;
        return (
          <div key={step.step} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  "flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold",
                  step.done
                    ? isCurrent
                      ? "bg-accent text-white"
                      : "bg-success text-white"
                    : "border-2 border-border-strong bg-bg-surface text-text-muted"
                )}
              >
                {step.done ? <Check className="h-5 w-5" aria-hidden /> : null}
              </div>
              {i < timeline.length - 1 && (
                <div className={clsx("w-0.5 flex-1 min-h-[24px]", step.done ? "bg-success" : "bg-border")} />
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
