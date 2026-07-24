"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function GuestFooter() {
  const t = useTranslations("common");
  return (
    <footer className="w-full border-t border-border bg-bg-surface py-6">
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-2 px-4 text-center text-base text-text-secondary">
        <p>{t("phoneSupport")}</p>
        <Link href="/kabinet" className="text-accent underline underline-offset-2">
          {t("myComplaints")}
        </Link>
      </div>
    </footer>
  );
}
