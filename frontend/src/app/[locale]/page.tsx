import { ArrowUpRight, FileEdit, Search, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { GuestLinkButton, guestButtonClasses } from "@/components/guest/GuestButton";
import { GuestShell } from "@/components/guest/GuestShell";
import { GildedRule, GirihField, GirihStar, SuzaniBloom } from "@/components/motifs";

export default function LandingPage() {
  const t = useTranslations("landing");
  const telegramUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const telegramHref = telegramUsername ? `https://t.me/${telegramUsername}` : null;

  const steps = [t("step1"), t("step2"), t("step3")];

  /* Kechki hero — sarlavha lentasidan uzluksiz davom etadi va pastki
     burchaklari yumaloq: sahifa «koshinli peshtoq» ostidan boshlanadi.
     Karta uni ustidan bosib chiqadi, shuning uchun hero'ning pastki
     to'ldirishi kartaning ko'tarilishi qadar. */
  const hero = (
    <section className="night-panel relative rounded-b-hero px-4 pb-16 pt-10 sm:pb-20 sm:pt-14">
      <GirihField color="#FFFFFF" opacity={0.1} tile={96} glazed />

      <div className="motif-drift pointer-events-none absolute -right-16 -top-10 opacity-90 sm:-right-6">
        <SuzaniBloom size={300} color="#FFFFFF" accent="var(--brass-light)" opacity={0.16} />
      </div>

      <div className="relative mx-auto flex max-w-[680px] flex-col items-start">
        <span
          className="reveal inline-flex items-center gap-2 rounded-pill border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/80"
          style={{ "--reveal-delay": "40ms" } as React.CSSProperties}
        >
          <GirihStar size={12} color="var(--brass-light)" />
          {t("badge")}
        </span>

        <h1
          className="reveal mt-5 text-[38px] font-extrabold leading-[1.06] text-white sm:text-[52px]"
          style={{ "--reveal-delay": "120ms" } as React.CSSProperties}
        >
          {t("greeting")}
        </h1>

        <p
          className="reveal mt-4 max-w-[30rem] text-lg leading-relaxed text-white/75 sm:text-xl"
          style={{ "--reveal-delay": "200ms" } as React.CSSProperties}
        >
          {t("subtitle")}
        </p>

        <div className="reveal mt-7" style={{ "--reveal-delay": "280ms" } as React.CSSProperties}>
          <GildedRule width={230} color="var(--brass-light)" />
        </div>
      </div>
    </section>
  );

  return (
    <GuestShell compact hero={hero}>
      {/* Harakatlar kartasi hero ustiga chiqadi — sahifaning yagona
          asosiy qarori shu yerda, ko'zdan qochib qolmaydi. */}
      <div
        className="reveal -mt-12 rounded-card border border-border bg-bg-surface p-4 shadow-float sm:-mt-14 sm:p-5"
        style={{ "--reveal-delay": "340ms" } as React.CSSProperties}
      >
        <GuestLinkButton href="/yangi" variant="primary">
          <FileEdit className="h-6 w-6" aria-hidden />
          {t("submitButton")}
          <ArrowUpRight className="h-5 w-5" aria-hidden />
        </GuestLinkButton>
        <p className="mt-2 text-center text-sm text-text-muted">{t("submitHint")}</p>

        <div className="mt-4 flex flex-col gap-3">
          <GuestLinkButton href="/holat" variant="secondary">
            <Search className="h-6 w-6" aria-hidden />
            {t("checkStatusButton")}
          </GuestLinkButton>

          {telegramHref ? (
            <a
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              className={guestButtonClasses("secondary", "border-accent/40 text-accent")}
            >
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
      </div>

      <div
        className="reveal flex flex-col gap-3 rounded-card border border-border bg-bg-surface p-5 shadow-card"
        style={{ "--reveal-delay": "420ms" } as React.CSSProperties}
      >
        <h2 className="text-xl font-bold text-text-primary">{t("howItWorksTitle")}</h2>
        <ol className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-base text-text-secondary">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent-soft text-sm font-extrabold text-accent">
                {i + 1}
              </span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-center text-base text-text-muted">{t("footerOrg")}</p>
    </GuestShell>
  );
}
