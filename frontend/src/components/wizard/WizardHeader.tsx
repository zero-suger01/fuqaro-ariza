"use client";

import { ArrowLeft, Check, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { clsx } from "clsx";
import { Link } from "@/i18n/navigation";

/** Back arrow + step tracker + current step's title, as one visual unit —
 * the tracker's circles carry each step's own icon (matching the title's
 * subject) instead of a plain number, so the line-of-circles and the
 * heading below it read as a single header rather than two stacked,
 * unrelated pieces. */
export function WizardHeader({
  step,
  icons,
  title,
}: {
  step: number;
  icons: LucideIcon[];
  title: string;
}) {
  const t = useTranslations("wizard");
  const total = icons.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Link href="/" aria-label={t("back")} className="text-text-secondary">
          <ArrowLeft className="h-6 w-6" aria-hidden />
        </Link>
        <div className="flex flex-1 items-center" aria-label={t("progress", { current: step, total })}>
          {icons.map((Icon, i) => {
            const stepNumber = i + 1;
            const isDone = stepNumber < step;
            const isCurrent = stepNumber === step;
            const isLast = i === total - 1;
            return (
              <div key={i} className={clsx("flex items-center", !isLast && "flex-1")}>
                <span
                  className={clsx(
                    "flex h-9 w-9 flex-none items-center justify-center rounded-full border-2",
                    isDone && "border-accent bg-accent text-white",
                    isCurrent && "border-accent bg-accent-soft text-accent",
                    !isDone && !isCurrent && "border-border-strong bg-bg-surface text-text-muted"
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
                </span>
                {!isLast && <span className={clsx("h-0.5 flex-1", isDone ? "bg-accent" : "bg-border-strong")} />}
              </div>
            );
          })}
        </div>
      </div>
      <h1 className="text-[28px] font-bold leading-snug text-text-primary">{title}</h1>
    </div>
  );
}
