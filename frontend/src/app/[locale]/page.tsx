import { FileEdit, Search, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { GuestLinkButton, guestButtonClasses } from "@/components/guest/GuestButton";
import { GuestShell } from "@/components/guest/GuestShell";

export default function LandingPage() {
  const t = useTranslations("landing");
  const telegramUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const telegramHref = telegramUsername ? `https://t.me/${telegramUsername}` : null;

  const steps = [t("step1"), t("step2"), t("step3")];

  return (
    <GuestShell compact>
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-[26px] font-bold leading-snug text-text-primary">{t("greeting")}</h1>
        <p className="text-base text-text-secondary">{t("subtitle")}</p>
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
        {telegramHref ? (
          <a href={telegramHref} target="_blank" rel="noopener noreferrer" className={guestButtonClasses("secondary", "border-accent/40 text-accent")}>
            <Send className="h-6 w-6" aria-hidden />
            {t("telegramButton")}
          </a>
        ) : (
          <button type="button" disabled className={guestButtonClasses("secondary", "border-accent/30 text-accent")}>
            <Send className="h-6 w-6" aria-hidden />
            {t("telegramComingSoon")}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-card bg-bg-surface p-4 shadow-card sm:p-5">
        <h2 className="text-lg font-semibold text-text-primary">{t("howItWorksTitle")}</h2>
        <ol className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-base text-text-secondary">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-1 text-center text-base text-text-muted">
        <p>{t("footerOrg")}</p>
      </div>
    </GuestShell>
  );
}
