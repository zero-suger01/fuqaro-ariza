import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CitizenComplaint } from "@/lib/types";

// Brend rangi (--shell, frontend/src/app/globals.css) — AnalyzingScreen'dagi
// vertikal timeline bilan bir xil vizual til (frontend/src/components/wizard
// /AnalyzingScreen.tsx).
const LINE_COLOR = "#0d3138";

// Fuqaro kabinetida "jonli status" — to'liq 4 bosqichli (qabul_qilindi/
// korilmoqda/ijroda/yakunlandi) o'rniga faqat 3 tasi ko'rsatiladi (mijoz
// so'ragan): "Ko'rib chiqilmoqda" 1-bosqichga qo'shib yuboriladi, chunki
// fuqaro uchun muhimi — qabul qilindimi, ishga tushdimi, tugadimi.
function stageIndex(status: CitizenComplaint["status_simple"]): number {
  if (status === "yakunlandi") return 2;
  if (status === "ijroda") return 1;
  return 0; // qabul_qilindi | korilmoqda
}

export function ComplaintStatusStepper({ status }: { status: CitizenComplaint["status_simple"] }) {
  const t = useTranslations("status.steps");
  const tStatus = useTranslations("status");

  if (status === "rad_etildi") {
    return (
      <span className="whitespace-nowrap rounded-pill bg-danger/10 px-3 py-1 text-sm font-medium text-danger">
        {tStatus("rejectedTitle")}
      </span>
    );
  }

  const current = stageIndex(status);
  const labels: Array<[string, string]> = [
    ["qabul_qilindi", t("qabul_qilindi")],
    ["ijroda", t("ijroda")],
    ["yakunlandi", t("yakunlandi")],
  ];

  return (
    // `items-start` (chapga tekislash) — `items-center` bo'lganda har bir
    // qator o'z matni kengligiga qarab MARKAZLASHTIRILGAN edi, shuning
    // uchun turli uzunlikdagi matnlar ("Qabul qilindi" vs "Ijroda")
    // doiralarni bir vertikal chiziqda tekis emas qilib ko'rsatardi.
    <ol className="flex shrink-0 flex-col items-start">
      {labels.map(([key, label], i) => {
        const done = i <= current;
        return (
          <li key={key} className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300"
                style={
                  done
                    ? { backgroundColor: LINE_COLOR, borderColor: LINE_COLOR }
                    : { borderColor: "var(--border)", backgroundColor: "transparent" }
                }
              >
                {done && <Check className="h-3 w-3 text-white" aria-hidden />}
              </span>
              {/* Matn rangi #0d3138'ga qattiq bog'lanmaydi — qorong'i rejimda
                  o'qilmaydigan bo'lib qolmasligi uchun tema o'zgaruvchisidan
                  foydalaniladi (rang faqat doira foni/chiziqda ishlatiladi). */}
              <span
                className={
                  done
                    ? "text-xs font-medium whitespace-nowrap text-text-primary"
                    : "text-xs whitespace-nowrap text-text-muted"
                }
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              // `w-5 justify-center` doira kengligiga teng — chiziq doira
              // markazi ostida qoladi, chapga tekislangan holatda ham.
              <div className="flex w-5 justify-center">
                <span
                  aria-hidden
                  className="my-0.5 h-4 w-0.5 shrink-0 transition-colors duration-300"
                  style={{ backgroundColor: i < current ? LINE_COLOR : "var(--border)" }}
                />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
