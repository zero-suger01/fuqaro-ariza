import { GuestFooter } from "@/components/guest/GuestFooter";
import { GuestHeader } from "@/components/guest/GuestHeader";

/** Single-column shell for citizen-facing pages: no sidebar, centred,
 * max-width 680px, large touch targets.
 *
 * `hero` renders full-bleed above the column — the landing page needs its
 * dark panel to reach both edges, which a padded container cannot do. */
export function GuestShell({
  children,
  districtId,
  compact = false,
  hero,
}: {
  children: React.ReactNode;
  districtId?: string | null;
  compact?: boolean;
  hero?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-app">
      <GuestHeader />
      {hero}
      <main
        className={`mx-auto flex w-full max-w-[680px] flex-1 flex-col px-4 ${
          compact ? "gap-3 py-4 sm:gap-4 sm:py-6" : "gap-6 py-8"
        }`}
      >
        {children}
      </main>
      <GuestFooter districtId={districtId} compact={compact} />
    </div>
  );
}
