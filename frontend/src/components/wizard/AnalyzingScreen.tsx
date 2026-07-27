"use client";

import { BadgeCheck, Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { AiComposingOrb } from "@/components/wizard/AiComposingOrb";

// Vertikal timeline rangi — sayt brendining asosiy to'q petrol rangi
// (--shell, frontend/src/app/globals.css), header foni bilan bir xil.
const LINE_COLOR = "#0d3138";

// Ariza yuborilgan (backend'da ticket allaqachon yaratilgan), lekin AI
// natijasi kutilmoqda — docs/10-ui-ux.md §2.9 "kutish holatlari
// tushuntiriladi" qoidasi bo'yicha vertikal timeline (doiralar + ulovchi
// chiziq) ko'rsatiladi, matn markazlashtirilgan. `useAiRouting`
// (frontend/src/lib/useAiRouting.ts) 20 s dan keyin baribir "qabul
// qilindi" ekraniga o'tkazadi.
//
// `confirmed` — AI natijasi kelgan payt (yangi/page.tsx bir necha soniya
// shu holatda ushlab turadi, keyin SuccessScreen'ga o'tadi): oxirgi
// bosqich generik "yo'naltiriladi" o'rniga aniq bo'lim nomi bilan
// "tasdiqlandi va yuborildi" matnini alohida ajratilgan (kartasimon,
// katta belgili) ko'rinishda ko'rsatadi — mijoz so'ragan: fuqaro buni
// osongina ko'rishi kerak.
export function AnalyzingScreen({
  confirmed = false,
  department = null,
}: {
  confirmed?: boolean;
  department?: string | null;
}) {
  const t = useTranslations("wizard.analyzing");
  const tSuccess = useTranslations("wizard.success");

  return (
    <div className="flex flex-col items-center gap-6 pt-8 text-center">
      <h1 className="max-w-xs text-lg leading-snug text-text-secondary sm:max-w-sm">
        {confirmed ? tSuccess("title") : t("title")}
      </h1>

      {!confirmed && <AiComposingOrb size={160} ariaLabel={t("title")} />}

      <ol className="flex w-full max-w-xs flex-col items-center sm:max-w-sm">
        <TimelineStep state="done" label={t("step1")} />
        <TimelineConnector filled={confirmed} />
        <TimelineStep state={confirmed ? "done" : "active"} label={t("step2")} />
        <TimelineConnector filled={confirmed} />
        {confirmed && department ? (
          <RoutedStep department={department} />
        ) : (
          <TimelineStep state="pending" label={t("step3")} />
        )}
      </ol>
    </div>
  );
}

function TimelineConnector({ filled }: { filled: boolean }) {
  return (
    <span
      aria-hidden
      className="h-8 w-0.5 shrink-0 transition-colors duration-500"
      style={{ backgroundColor: filled ? LINE_COLOR : "var(--border)" }}
    />
  );
}

function TimelineStep({
  state,
  label,
}: {
  state: "done" | "active" | "pending";
  label: string;
}) {
  return (
    <li className="flex flex-col items-center gap-2">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-500"
        style={
          state === "done"
            ? { backgroundColor: LINE_COLOR, borderColor: LINE_COLOR }
            : state === "active"
              ? { borderColor: LINE_COLOR, backgroundColor: "transparent" }
              : { borderColor: "var(--border)", backgroundColor: "transparent" }
        }
      >
        {state === "done" && <Check className="h-5 w-5 text-white" aria-hidden />}
        {state === "active" && (
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: LINE_COLOR }} aria-hidden />
        )}
      </span>
      <span
        className={
          state === "pending" ? "text-base text-text-muted" : "text-base text-text-primary"
        }
      >
        {label}
      </span>
    </li>
  );
}

// Oxirgi bosqich — AI qaysi bo'limga yo'naltirganini fuqaro darhol
// ko'rishi kerak (mijoz so'ragan "better UI, user can see"), shuning
// uchun oddiy matn emas, ajralib turadigan karta: katta belgi doirasi +
// aniq rangdagi bo'lim nomi.
function RoutedStep({ department }: { department: string }) {
  const tSuccess = useTranslations("wizard.success");
  return (
    <li className="flex w-full flex-col items-center gap-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: LINE_COLOR }}
      >
        <Check className="h-5 w-5 text-white" aria-hidden />
      </span>
      {/* Matn/ikon rangi qattiq #0d3138'ga bog'lanmaydi — qorong'i rejimda
          o'qilmaydigan bo'lib qolmasligi uchun tema o'zgaruvchisi ishlatiladi
          (rang faqat ramka/fon belgisida, dekorativ, ikkala rejimda ham OK). */}
      <div
        className="flex w-full flex-col items-center gap-2 rounded-card border-2 px-4 py-3 text-text-primary"
        style={{ borderColor: LINE_COLOR, backgroundColor: `${LINE_COLOR}0d` }}
      >
        <BadgeCheck className="h-6 w-6 shrink-0" aria-hidden />
        <p className="text-base font-semibold">
          {tSuccess.rich("aiRouted", { department, b: (chunks) => <b>{chunks}</b> })}
        </p>
      </div>
    </li>
  );
}
