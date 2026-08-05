"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ComplaintList, ComplaintRowSkeleton, type ComplaintColumn } from "@/components/admin/ComplaintList";
import { SegmentedTabs } from "@/components/admin/SegmentedTabs";
import { apiGet, apiPost } from "@/lib/api";
import { useNow } from "@/lib/useNow";
import { formatUzDayLong } from "@/lib/formatDate";
import type { ComplaintListItem, Page } from "@/lib/types";

/**
 * R2/Q3 — «Navbatim»: xodim login qilganda jadval emas, ISH NAVBATI kutib
 * oladi.
 *
 * v1.9 — uch ustunli kanban o'rniga tab + zich ro'yxat (docs/10 §10.2).
 * Muhimi ko'rinish emas, ma'lumot: avval sahifa BITTA so'rov bilan 100 ta
 * yozuv olib, guruhlashni ham, saralashni ham mijozda qilardi. Ikki
 * oqibati bor edi:
 *   1. So'rov `page_size=100` ni STATUS FILTRISIZ olardi va faqat keyin
 *      mijozda faol statuslarni ajratardi — bo'limda 100 tadan ko'p
 *      murojaat bo'lsa (yopilganlari bilan birga), faol ishning bir qismi
 *      ro'yxatga umuman tushmasdi va buni hech narsa bildirmasdi.
 *   2. Guruh sonlari o'sha kelgan bo'lakdan hisoblanardi, ya'ni ular
 *      haqiqiy son emas edi — «Barcha murojaatlar»dagi «20/0/0» bilan bir
 *      xil kasallik.
 * Endi har tab — alohida server so'rovi, son esa serverning `total` i.
 */
const TABS: {
  key: string;
  label: string;
  dotColor: string | null;
  params: Record<string, string>;
  empty: string;
  /** Tab statusni o'zi belgilaydigan bo'lsa, `Holat` ustuni har qatorda
   *  bir xil qiymat ko'rsatardi — nol axborot, shuning uchun olib
   *  tashlanadi. */
  columns: ComplaintColumn[];
}[] = [
  {
    key: "bolim",
    label: "Bo'lim navbati",
    dotColor: "var(--accent)",
    params: { unclaimed: "true" },
    empty: "Egasiz ish yo'q — hammasi taqsimlangan",
    columns: ["status", "priority", "deadline"],
  },
  {
    key: "qabul",
    label: "Qabul qilganlarim",
    dotColor: "var(--st-new)",
    params: { mine: "true", status: "accepted" },
    empty: "Qabul qilingan, hali boshlanmagan ish yo'q",
    columns: ["priority", "deadline"],
  },
  {
    key: "ijro",
    label: "Ijrodagi ishlarim",
    dotColor: "var(--info)",
    params: { mine: "true", status: "in_progress" },
    empty: "Ijroda ish yo'q",
    columns: ["priority", "deadline"],
  },
  {
    key: "kutilmoqda",
    label: "Ma'lumot kutilmoqda",
    dotColor: "var(--warning)",
    params: { mine: "true", status: "need_info" },
    empty: "Kutilayotgan javob yo'q",
    columns: ["priority", "deadline"],
  },
];

const PAGE_SIZE = 50;

function paramsFor(key: string, pageSize: number): string {
  const tab = TABS.find((t) => t.key === key) ?? TABS[0];
  const p = new URLSearchParams(tab.params);
  p.set("page", "1");
  p.set("page_size", String(pageSize));
  return p.toString();
}

export default function NavbatimPage() {
  const now = useNow();

  const [active, setActive] = useState(TABS[0].key);
  const [result, setResult] = useState<Page<ComplaintListItem> | null>(null);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  // Sonlar — har tab uchun serverning `total` i (`page_size=1`, ya'ni
  // yozuvlar tashilmaydi). Mijozda hisoblansa yolg'on chiqardi.
  const loadCounts = useCallback(() => {
    Promise.all(
      TABS.map((t) =>
        apiGet<Page<ComplaintListItem>>(`/api/admin/complaints?${paramsFor(t.key, 1)}`)
          .then((r) => [t.key, r.total] as const)
          .catch(() => [t.key, 0] as const)
      )
    ).then((pairs) => setCounts(Object.fromEntries(pairs)));
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the fetch below
    setLoading(true);
    apiGet<Page<ComplaintListItem>>(`/api/admin/complaints?${paramsFor(active, PAGE_SIZE)}`)
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [active]);

  // «Qabul qilaman» — navbatning butun maqsadi shu. Avval buni qilish
  // uchun murojaatni ochish, tugmani topish va orqaga qaytish kerak edi;
  // ya'ni har ish uchun uch marta sahifa almashardi.
  const [claiming, setClaiming] = useState<string | null>(null);
  const claim = useCallback(
    async (id: string) => {
      setClaiming(id);
      try {
        await apiPost(`/api/admin/complaints/${id}/claim`, {});
        // Ish bo'lim navbatidan chiqib «Qabul qilganlarim» ga o'tadi —
        // ikkala son ham, joriy ro'yxat ham yangilanishi kerak.
        const [page] = await Promise.all([
          apiGet<Page<ComplaintListItem>>(`/api/admin/complaints?${paramsFor(active, PAGE_SIZE)}`),
          Promise.resolve(loadCounts()),
        ]);
        setResult(page);
      } catch {
        // Boshqa xodim ilgarilab ketgan bo'lishi mumkin — ro'yxatni
        // yangilash o'zi haqiqatni ko'rsatadi.
        loadCounts();
      } finally {
        setClaiming(null);
      }
    },
    [active, loadCounts]
  );

  const tab = TABS.find((t) => t.key === active) ?? TABS[0];
  const items = result?.items ?? [];
  const total = result?.total ?? 0;
  const mineTotal = counts ? counts.qabul + counts.ijro + counts.kutilmoqda : null;

  return (
    <AppShell title="Navbatim" requireRoles={["department_staff"]}>
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        {/* Bo'lim nomi bu yerdan olib tashlandi: u topbardagi foydalanuvchi
            kartasida allaqachon yozilgan va ikkalasi 40px oralig'ida turardi. */}
        <p className="text-sm text-text-secondary">{now === 0 ? "" : formatUzDayLong(now)}</p>
        {counts && (
          <p className="text-sm text-text-muted">
            Menda {mineTotal} ish · bo&apos;lim navbatida {counts.bolim}
          </p>
        )}
      </div>

      <Card padded={false}>
        <div className="px-4 py-3">
          <SegmentedTabs
            ariaLabel="Navbat"
            value={active}
            onChange={setActive}
            tabs={TABS.map((t) => ({
              key: t.key,
              label: t.label,
              dotColor: t.dotColor,
              count: counts ? counts[t.key] : null,
            }))}
          />
        </div>
      </Card>

      {loading ? (
        <Card padded={false} className="overflow-hidden">
          <div className="divide-y divide-border">
            {[0, 1, 2, 3].map((i) => (
              <ComplaintRowSkeleton key={i} />
            ))}
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <div className="py-14 flex flex-col items-center gap-2 text-text-muted text-sm">
            <ClipboardList className="h-6 w-6" aria-hidden />
            {tab.empty}
          </div>
        </Card>
      ) : (
        // `now` berilgani uchun muddat nisbiy ko'rinadi («3 soat qoldi») —
        // navbatda absolute sana shoshilinchlikni ko'rsatmaydi.
        <ComplaintList
          items={items}
          columns={tab.columns}
          showAiSummary
          now={now}
          rowAction={
            tab.key === "bolim"
              ? (c) => (
                  <Button
                    onClick={() => claim(c.id)}
                    disabled={claiming === c.id}
                    aria-label={`${c.ticket_number} — qabul qilaman`}
                  >
                    {claiming === c.id ? "..." : "Qabul qilaman"}
                  </Button>
                )
              : undefined
          }
        />
      )}

      {/* Kesib qolinganini YASHIRMAYMIZ — avval sahifa jimgina 100 ta bilan
          cheklanardi va xodim buni bilmasdi. */}
      {total > items.length && (
        <p className="text-xs text-text-muted">
          Ko&apos;rsatildi: {items.length} / {total} ta.{" "}
          <Link href="/admin/murojaatlar" className="text-accent hover:underline">
            To&apos;liq ro&apos;yxat va filtrlar
          </Link>
        </p>
      )}

      <p className="text-xs text-text-muted">
        Murojaatni ochish holatni o&apos;zgartirmaydi — ishni olish uchun «Qabul qilaman» tugmasini bosasiz.
        {tab.key === "bolim" && " Bu ro'yxatdagi ish hali hech kimga biriktirilmagan."}
      </p>
    </AppShell>
  );
}
