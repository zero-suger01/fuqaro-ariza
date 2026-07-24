import { GuestFooter } from "@/components/guest/GuestFooter";
import { GuestHeader } from "@/components/guest/GuestHeader";

/** Single-column shell for citizen-facing pages (docs/10-ui-ux.md §1-2):
 * no sidebar, centered, max-width 640px, large touch targets. */
export function GuestShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <GuestHeader />
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-6 px-4 py-8">{children}</main>
      <GuestFooter />
    </div>
  );
}
