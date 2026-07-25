// Intl's "uz-UZ"/"oz-UZ" ICU data is incomplete in most runtimes (falls back
// to "M07" instead of a month name), so uz/oz format manually per
// docs/10-ui-ux.md §9 ("24-iyul, 09:30"); ru/en use Intl, which is reliable.
const UZ_MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];
const OZ_MONTHS = [
  "январ", "феврал", "март", "апрел", "май", "июн",
  "июл", "август", "сентябр", "октябр", "ноябр", "декабр",
];

const UZ_WEEKDAYS: Record<string, string> = {
  Sun: "yakshanba", Mon: "dushanba", Tue: "seshanba", Wed: "chorshanba",
  Thu: "payshanba", Fri: "juma", Sat: "shanba",
};

/** Admin paneli uchun (uz-only, docs/10-ui-ux.md §1): "25-iyul, shanba".
 * Intl'ning uz-UZ ma'lumoti to'liq emas — "M07 25, Sat" qaytaradi, shuning
 * uchun oy va hafta kuni qo'lda o'giriladi. */
export function formatUzDayLong(ms: number): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tashkent",
      day: "numeric",
      month: "numeric",
      weekday: "short",
    })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, p.value])
  );
  return `${parts.day}-${UZ_MONTHS[Number(parts.month) - 1]}, ${UZ_WEEKDAYS[parts.weekday] ?? ""}`;
}

/** "28-iyul, 01:57" — sana + vaqt, Asia/Tashkent (admin, uz). */
export function formatUzDateTime(iso: string): string {
  return formatDate(iso, "uz");
}

function tashkentParts(iso: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tashkent",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(dtf.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return { day: parts.day, month: Number(parts.month), hour: parts.hour, minute: parts.minute };
}

export function formatDate(iso: string, locale: string): string {
  const { day, month, hour, minute } = tashkentParts(iso);
  if (locale === "ru") {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tashkent",
    });
  }
  if (locale === "en") {
    return new Date(iso).toLocaleString("en-US", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tashkent",
    });
  }
  const monthName = locale === "oz" ? OZ_MONTHS[month - 1] : UZ_MONTHS[month - 1];
  return `${day}-${monthName}, ${hour}:${minute}`;
}
