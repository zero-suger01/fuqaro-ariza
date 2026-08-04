import { GuestFooter } from "@/components/guest/GuestFooter";
import { GuestHeader } from "@/components/guest/GuestHeader";

/** Single-column shell for citizen-facing pages (docs/10-ui-ux.md §1-2):
 * no sidebar, centered, max-width 640px, large touch targets. */
export function GuestShell({ children, districtId, compact = false }: { children: React.ReactNode; districtId?: string | null; compact?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <GuestHeader />
      <main className={`mx-auto flex w-full max-w-[640px] flex-1 flex-col px-4 ${compact ? "gap-3 py-4 sm:gap-4 sm:py-6" : "gap-6 py-8"}`}>{children}</main>
      <GuestFooter districtId={districtId} compact={compact} />
    </div>
  );
}
