import type { LucideIcon } from "lucide-react";

/** Icon-badge + bold title, used at the top of every citizen-facing form
 * page — gives plain headings ("Kirish", "Muammoni ayting"...) the same
 * accent-soft circular-badge treatment already used for section headers
 * and the success screen, instead of bare text. */
export function GuestPageTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-accent-soft">
        <Icon className="h-5 w-5 text-accent" aria-hidden />
      </span>
      <h1 className="text-[28px] font-bold leading-snug text-text-primary">{children}</h1>
    </div>
  );
}
