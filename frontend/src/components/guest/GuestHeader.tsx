"use client";

import { FileText } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { ThemeToggle } from "@/components/guest/ThemeToggle";
import { GirihField } from "@/components/motifs";

const LOCALE_LABELS: Record<string, string> = {
  uz: "Oʻz",
  oz: "Ўз",
  ru: "Рус",
  en: "EN",
};

/**
 * Fuqaro sarlavha lentasi — kechki lojuvard zamin + panjara naqshi.
 *
 * **Jakob:** davlat xizmatlari butun dunyoda aynan shunday taniladi —
 * to'q identifikatsiya lentasi, muhr va idora nomi. 72 yoshli
 * foydalanuvchi «bu haqiqiy hokimlikmi yoki firibgarlikmi» savoliga shu
 * yerda javob oladi.
 *
 * **Proximity:** ikki guruh aniq ajratilgan — chapda KIM (logotip),
 * o'ngda VOSITALAR (til, kabinet, tema).
 *
 * **Fitts:** har bir nishon >= 44px.
 *
 * **Hick:** 4 ta til ko'rinib turishi SHART (kirill o'quvchi keksa avlod
 * uchun), lekin ular endi bitta segment ichida — vizual jihatdan bitta
 * boshqaruv, asosiy harakat bilan raqobatlashmaydi.
 *
 * Naqsh pichirlash darajasida (opacity .07): u lentani «koshin» qiladi,
 * lekin logotip va matnni hech qachon bosmaydi.
 */
export function GuestHeader() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <header className="night-panel night-panel--flat relative w-full">
      <GirihField color="#FFFFFF" opacity={0.07} tile={104} />

      <div className="relative mx-auto flex max-w-[680px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        {/* KIM — identifikatsiya */}
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
          <nav
            aria-label="Til tanlash"
            className="flex items-center rounded-pill border border-white/20 bg-white/10 p-0.5"
          >
            {routing.locales.map((loc) => (
              <Link
                key={loc}
                href={pathname}
                locale={loc}
                aria-current={loc === locale ? "true" : undefined}
                className={
                  loc === locale
                    ? "flex min-h-10 min-w-10 items-center justify-center rounded-pill bg-white px-2.5 text-xs font-bold text-night-1"
                    : "flex min-h-10 min-w-10 items-center justify-center rounded-pill px-2.5 text-xs font-semibold text-sidebar-text transition-colors hover:text-sidebar-text-hover"
                }
              >
                {LOCALE_LABELS[loc]}
              </Link>
            ))}
          </nav>

          <Link
            href="/kabinet"
            aria-label={t("myComplaints")}
            /* `min-w-11` ham kerak: `sm` dan pastda yozuv yashiriladi va
               faqat ikon qolib, nishon 40px ga tushib ketardi. */
            className="press flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-pill px-3 text-sm font-semibold text-sidebar-text hover:bg-sidebar-hover-bg hover:text-sidebar-text-hover"
          >
            <FileText className="h-4 w-4 shrink-0" aria-hidden />
            {/* Yozuv har tilda juda har xil uzunlikda — `sm` dan pastda uni
                yashirish barcha 4 tilda bir xil o'ralish beradi. */}
            <span className="hidden sm:inline">{t("myComplaints")}</span>
          </Link>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
