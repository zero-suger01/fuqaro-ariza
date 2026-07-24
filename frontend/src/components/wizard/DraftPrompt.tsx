"use client";

import { useTranslations } from "next-intl";
import { GuestButton } from "@/components/guest/GuestButton";

export function DraftPrompt({ onResume, onDiscard }: { onResume: () => void; onDiscard: () => void }) {
  const t = useTranslations("wizard.draftPrompt");

  return (
    <div className="flex flex-col gap-4 rounded-card border-2 border-accent bg-accent-soft p-5">
      <p className="text-lg font-medium text-text-primary">{t("message")}</p>
      <div className="flex gap-3">
        <GuestButton variant="secondary" onClick={onDiscard} className="flex-1">
          {t("discard")}
        </GuestButton>
        <GuestButton variant="primary" onClick={onResume} className="flex-1">
          {t("resume")}
        </GuestButton>
      </div>
    </div>
  );
}
