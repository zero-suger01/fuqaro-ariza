import { clsx } from "clsx";
import { Check, X } from "lucide-react";
import type { ComplaintStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/status";

const STEPS: ComplaintStatus[] = [
  "yangi",
  "korib_chiqilmoqda",
  "masul_tashkilotga_yuborildi",
  "jarayonda",
  "hal_qilindi",
];

export function StatusTimeline({ status }: { status: ComplaintStatus }) {
  if (status === "rad_etildi") {
    return (
      <div className="flex items-center gap-3 rounded-inner bg-danger/10 px-4 py-3">
        <div className="h-7 w-7 rounded-full bg-danger text-white flex items-center justify-center shrink-0">
          <X className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium text-danger">{STATUS_LABELS.rad_etildi}</p>
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(status);

  return (
    <div className="flex items-start">
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={step} className={clsx("flex items-center", !isLast && "flex-1")}>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                className={clsx(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                  done ? "bg-success text-white" : "bg-bg-subtle text-text-muted border border-border"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <p className={clsx("text-[11px] text-center max-w-[80px]", done ? "text-text-primary font-medium" : "text-text-muted")}>
                {STATUS_LABELS[step]}
              </p>
            </div>
            {!isLast && <div className={clsx("h-0.5 flex-1 mx-1 mt-3.5", i < currentIndex ? "bg-success" : "bg-border")} />}
          </div>
        );
      })}
    </div>
  );
}
