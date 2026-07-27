"use client";

import { FileText } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { ThemeToggle } from "@/components/guest/ThemeToggle";

const LOCALE_LABELS: Record<string, string> = {
  uz: "O'z",
  oz: "Ўз",
  ru: "Ру",
  en: "En",
};

/**
 * Fuqaro sarlavha lentasi — to'q petrol zamin + latun muhr.
 *
 * **Jakob:** davlat xizmatlari butun dunyoda aynan shunday taniladi —
 * to'q identifikatsiya lentasi, gerb/muhr va idora nomi. Avval bu oddiy
 * oq chiziq edi va sayt istalgan xususiy ilovaga o'xshardi; 72 yoshli
 * foydalanuvchi uchun «bu haqiqiy hokimlikmi yoki firibgarlikmi»
 * savoliga javob bermasdi. Idora nomi ham faqat futerda turardi.
 *
 * **Proximity:** ikki guruh aniq ajratilgan — chapda KIM (muhr + nom +
 * idora), o'ngda VOSITALAR (til, kabinet, tema). Avval til tanlagich,
 * «Murojaatlarim» va tema tugmasi bir xil oraliq bilan yonma-yon
 * turardi, ya'ni uchta bog'liq bo'lmagan vazifa bitta guruhdek
 * ko'rinardi.
 *
 * **Fitts:** til havolalari avval ~26px balandlikda edi — barmoq uchun
 * juda kichik. Endi hammasi ≥44px.
 *
 * **Hick:** 4 ta til ko'rinib turishi SHART (docs/10 §9 — kirill
 * o'quvchi keksa avlod uchun), lekin ular endi vizual jihatdan tinch:
 * asosiy harakat bilan raqobatlashmaydi.
 *
 * Matn ranglari `--sidebar-*` shkalasidan — u aslida «to'q qobiq ustidagi
 * matn» shkalasi va sidebar bilan bu lenta bir xil `--shell` sirtida
 * turadi, shuning uchun ikkinchi nusxa token yaratilmadi.
 */
export function GuestHeader() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <header className="w-full bg-shell">
      <div className="mx-auto flex max-w-[640px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        {/* KIM — identifikatsiya. Logo (belgi + "e-Murojaat" so'z belgisi)
           haqiqiy brend rasmi — quraman/muhr ikonkasi va matn o'rniga. */}
        <Link href="/" className="flex items-center rounded-control py-1 text-sidebar-text-hover">
          <Image
            src="/logo-header.png"
            alt={t("appName")}
            width={1467}
            height={421}
            priority
            className="h-9 w-auto"
          />
        </Link>

        {/* VOSITALAR — alohida guruh */}
        <div className="flex items-center gap-1.5">
          <nav className="flex items-center" aria-label="Til tanlash">
            {routing.locales.map((loc) => (
              <Link
                key={loc}
                href={pathname}
                locale={loc}
                aria-current={loc === locale ? "true" : undefined}
                className={
                  loc === locale
                    ? "flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-sm font-semibold text-brass-light"
                    : "flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-sm font-medium text-sidebar-text hover:bg-sidebar-hover-bg hover:text-sidebar-text-hover"
                }
              >
                {LOCALE_LABELS[loc]}
              </Link>
            ))}
          </nav>

          <span className="h-5 w-px bg-sidebar-border" aria-hidden />

          <Link
            href="/kabinet"
            aria-label={t("myComplaints")}
            /* `min-w-11` ham kerak: `sm` dan pastda yozuv yashiriladi va
               faqat 16px ikon qolib, nishon 40px ga tushib ketardi. */
            className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-pill px-3 text-sm font-semibold text-sidebar-text hover:bg-sidebar-hover-bg hover:text-sidebar-text-hover"
          >
            <FileText className="h-4 w-4 shrink-0" aria-hidden />
            {/* "Mening murojaatlarim" translates to very different lengths
             * per locale (e.g. Cyrillic "Менинг мурожаатларим" is much
             * longer than "En" locale's "My complaints") — on narrow
             * screens that made the header wrap into a second row for
             * some languages but not others. Hiding the label below the
             * `sm` breakpoint (icon stays, aria-label covers a11y) makes
             * the wrap behavior identical across all 4 locales. */}
            <span className="hidden sm:inline">{t("myComplaints")}</span>
          </Link>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
