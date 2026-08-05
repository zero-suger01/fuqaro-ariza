"use client";

import { useEffect, useState } from "react";
import { Phone, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { apiGet } from "@/lib/api";
import { IkatBand } from "@/components/motifs";

function displayPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("998"))
    return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10, 12)}`;
  return phone;
}

export function GuestFooter({ districtId, compact = false }: { districtId?: string | null; compact?: boolean }) {
  const t = useTranslations("common");
  const [contact, setContact] = useState<{ phone: string | null; telegram_url: string | null } | null>(null);

  useEffect(() => {
    const query = districtId ? `?district_id=${encodeURIComponent(districtId)}` : "";
    apiGet<{ phone: string | null; telegram_url: string | null }>(`/api/public/support${query}`)
      .then(setContact)
      .catch(() => setContact(null));
  }, [districtId]);

  const phone = contact?.phone;

  return (
    <footer className={`w-full border-t border-border bg-bg-surface ${compact ? "py-4" : "py-6"}`}>
      <div className="mx-auto flex max-w-[680px] flex-col items-center gap-3 px-4 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-text-secondary">
          <a
            href={phone ? `tel:${phone}` : undefined}
            aria-disabled={!phone}
            className="press inline-flex min-h-11 items-center gap-2 rounded-pill border-[1.5px] border-border-strong px-4 py-2 font-semibold hover:border-accent hover:text-accent"
          >
            <Phone className="h-4 w-4 text-accent" aria-hidden />
            <span>
              {t("phoneSupport")}
              {phone ? `: ${displayPhone(phone)}` : ""}
            </span>
          </a>

          {contact?.telegram_url ? (
            <a
              href={contact.telegram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex min-h-11 items-center gap-2 rounded-pill bg-[#229ED9] px-4 py-2 font-semibold text-white hover:brightness-95"
            >
              <Send className="h-4 w-4" aria-hidden />
              {t("telegramButton")}
            </a>
          ) : (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-border px-4 py-2 text-text-muted">
              <Send className="h-4 w-4" aria-hidden />
              {t("telegramComingSoon")}
            </span>
          )}
        </div>

        {/* Abrbandi lentasi — sahifani yopadigan bezak, ma'lumot emas */}
        <IkatBand
          width={260}
          height={26}
          color="var(--accent)"
          accent="var(--brass)"
          opacity={0.55}
          repeat={5}
          className="max-w-full"
        />
      </div>
    </footer>
  );
}
