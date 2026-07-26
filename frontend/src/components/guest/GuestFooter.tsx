"use client";

import { useTranslations } from "next-intl";

export function GuestFooter() {
  const t = useTranslations("common");
  return (
    <footer className="w-full border-t border-border bg-bg-surface py-6">
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-2 px-4 text-center text-base text-text-secondary">
        <p>{t("phoneSupport")}</p>
      </div>
    </footer>
  );
}
