import { FileEdit, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { GuestLinkButton } from "@/components/guest/GuestButton";
import { GuestShell } from "@/components/guest/GuestShell";

export default function LandingPage() {
  const t = useTranslations("landing");

  const steps = [t("step1"), t("step2"), t("step3")];

  return (
    <GuestShell>
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-[28px] font-bold leading-snug text-text-primary">{t("greeting")}</h1>
        <p className="text-lg text-text-secondary">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col gap-4">
        <GuestLinkButton href="/yangi" variant="primary">
          <FileEdit className="h-6 w-6" aria-hidden />
          {t("submitButton")}
        </GuestLinkButton>
        <GuestLinkButton href="/holat" variant="secondary">
          <Search className="h-6 w-6" aria-hidden />
          {t("checkStatusButton")}
        </GuestLinkButton>
      </div>

      <div className="flex flex-col gap-4 rounded-card bg-bg-surface p-6 shadow-card">
        <h2 className="text-xl font-semibold text-text-primary">{t("howItWorksTitle")}</h2>
        <ol className="flex flex-col gap-4">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-lg text-text-secondary">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent-soft text-base font-bold text-accent">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-1 text-center text-base text-text-muted">
        <p>{t("footerOrg")}</p>
        <p>{t("footerBot")}</p>
      </div>
    </GuestShell>
  );
}
