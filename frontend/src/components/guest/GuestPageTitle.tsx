import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

/** Icon-badge + bold title, used at the top of every citizen-facing form
 * page — gives plain headings ("Kirish", "Muammoni ayting"...) the same
 * accent circular-badge treatment used for section headers and the success
 * screen, instead of bare text.
 *
 * The title wraps rather than truncating: across four languages these
 * headings differ wildly in length, and "Murojaat holatini teksh…" tells a
 * 72-year-old reader nothing. Two lines cost less than a lost word.
 */
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
      <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-accent-soft ring-1 ring-accent/15">
        <Icon className="h-5 w-5 text-accent" aria-hidden />
      </span>
      <h1
        className={clsx(
          "min-w-0 flex-1 text-balance",
          titleClassName ?? "text-[26px] font-extrabold leading-tight text-text-primary sm:text-[30px]"
        )}
      >
        {children}
      </h1>
    </div>
  );
}
