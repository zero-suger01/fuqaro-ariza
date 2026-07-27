import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

/** Icon-badge + bold title, used at the top of every citizen-facing form
 * page — gives plain headings ("Kirish", "Muammoni ayting"...) the same
 * accent-soft circular-badge treatment already used for section headers
 * and the success screen, instead of bare text.
 *
 * `titleClassName` — faqat kabinet sahifasida sarlavha bir qatordagi
 * harakat tugmalari (Yangi murojaat/Tozalash/Chiqish) bilan sig'ishi uchun
 * kichikroq o'lchamga qayta yoziladi (mijoz so'ragan); standart holatda
 * o'zgarishsiz qoladi. */
export function GuestPageTitle({
  icon: Icon,
  children,
  titleClassName,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  titleClassName?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-accent-soft">
        <Icon className="h-5 w-5 text-accent" aria-hidden />
      </span>
      {/* `min-w-0 flex-1 truncate` — agar bitta qatordagi harakat tugmalari
          (kabinet) joy qoldirmasa, sarlavha matni ustma-ust chiqib
          ketmasdan "..." bilan qisqaradi (flex-shrink bug'ining
          xavfsizlik to'ri). */}
      <h1
        className={clsx(
          "min-w-0 flex-1 truncate",
          titleClassName ?? "text-[28px] font-bold leading-snug text-text-primary"
        )}
      >
        {children}
      </h1>
    </div>
  );
}
