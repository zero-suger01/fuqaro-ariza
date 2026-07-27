"use client";

import { clsx } from "clsx";

export interface SegmentedTab {
  key: string;
  label: string;
  /** Yorliq oldidagi holat nuqtasi (ixtiyoriy). */
  dotColor?: string | null;
  /** `null` bo'lsa son ko'rsatilmaydi (hali yuklanmagan). */
  count?: number | null;
}

/**
 * Bosqich/navbat tablari — admin ro'yxatlari uchun umumiy (v1.9).
 *
 * Suriladigan ko'rsatkich SOF CSS bilan: `sm` dan boshlab tablar teng
 * kenglikda bo'lgani uchun indikatorni o'z kengligiga
 * `translateX(i * 100%)` qilib surish yetarli — DOM o'lchash, ref va
 * effekt kerak emas (o'lcha-keyin-setState naqshi `useEffect` ichida
 * setState talab qilardi, bu esa loyihada taqiqlangan).
 *
 * 375px da uzun yorliqlar teng ustunlarga sig'maydi (o'lchandi —
 * «Yakunlangan» qirqilardi), shuning uchun mobil ko'rinish gorizontal
 * siljiydigan qatorga o'tadi: yorliqlar to'liq o'qiladi, faol tab esa
 * indikator o'rniga o'z foni bilan ajralib turadi.
 *
 * DIQQAT: son har doim SERVERDAN kelishi kerak. Mijoz tomonida joriy
 * sahifadagi yozuvlardan hisoblansa yolg'on chiqadi — kanban aynan shu
 * sababdan «20/0/0» ko'rsatardi (docs/10 §10.2).
 */
export function SegmentedTabs({
  tabs,
  value,
  onChange,
  ariaLabel,
}: {
  tabs: SegmentedTab[];
  value: string;
  onChange: (key: string) => void;
  ariaLabel: string;
}) {
  const index = Math.max(
    0,
    tabs.findIndex((t) => t.key === value)
  );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="no-scrollbar relative flex gap-1 overflow-x-auto rounded-pill bg-bg-subtle p-1 sm:grid sm:gap-0 sm:overflow-visible"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-1 left-1 hidden rounded-pill bg-bg-surface shadow-card transition-transform duration-300 ease-out motion-reduce:transition-none sm:block"
        style={{
          width: `calc((100% - 0.5rem) / ${tabs.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key || "all"}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={clsx(
              "relative z-10 flex shrink-0 items-center justify-center gap-1.5 rounded-pill px-3 py-2 text-[13px] transition-colors sm:min-w-0 sm:shrink sm:gap-2",
              active
                ? // Mobilda indikator yo'q (siljiydigan qator) — faol tab
                  // o'z foni bilan ajraladi; sm dan boshlab foni indikatorga
                  // o'tadi, aks holda ikkitasi ustma-ust tushardi.
                  "bg-bg-surface font-semibold text-text-primary shadow-card sm:bg-transparent sm:shadow-none"
                : "font-medium text-text-muted hover:text-text-secondary"
            )}
          >
            {tab.dotColor && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: tab.dotColor }}
                aria-hidden
              />
            )}
            <span className="sm:truncate">{tab.label}</span>
            {/* Kichik ekranda son yashiriladi — u yerda joy siljish bilan
                yechilgan, son esa qatorni keraksiz uzaytirardi. */}
            {tab.count != null && (
              <span
                className={clsx(
                  "hidden shrink-0 rounded-pill px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums sm:inline",
                  active ? "bg-bg-subtle text-text-secondary" : "text-text-muted"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
