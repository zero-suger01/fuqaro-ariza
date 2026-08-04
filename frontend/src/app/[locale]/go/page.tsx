"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { GuestShell } from "@/components/guest/GuestShell";
import { GuestLinkButton, guestButtonClasses } from "@/components/guest/GuestButton";
import { apiGet } from "@/lib/api";
import type { QrLanding } from "@/lib/types";

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

function GoContent() {
  const t = useTranslations("go");
  const searchParams = useSearchParams();
  const code = searchParams.get("m");

  const [landing, setLanding] = useState<QrLanding | null>(null);

  useEffect(() => {
    if (!code) return;
    apiGet<QrLanding>(`/api/public/qr/${encodeURIComponent(code)}`)
      .then((res) => {
        setLanding(res);
      })
      .catch(() => {
        // Noto'g'ri/eskirgan QR kod bo'lsa sahifa baribir ishlayveradi —
        // shaxsiylashtirilgan mahalla nomi ko'rsatilmaydi, xolos.
      });
  }, [code]);

  const webHref = code ? `/yangi?qr=${encodeURIComponent(code)}` : "/yangi";
  const telegramHref = TELEGRAM_BOT_USERNAME
    ? `https://t.me/${TELEGRAM_BOT_USERNAME}${code ? `?start=qr_${encodeURIComponent(code)}` : ""}`
    : null;

  return (
    <GuestShell districtId={landing?.district_id}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-[22px] font-bold text-text-primary">{t("orgName")}</h1>
        {landing?.neighborhood_name && (
          <p className="text-lg text-text-secondary">
            &ldquo;{landing.neighborhood_name}&rdquo; {t("neighborhoodSuffix")}
          </p>
        )}
        {(landing?.district || landing?.mfy || landing?.street) && (
          <p className="text-base text-text-secondary">
            {[landing.district, landing.mfy, landing.street].filter(Boolean).join(" — ")}
          </p>
        )}
      </div>

      <h2 className="text-center text-xl font-semibold text-text-primary">{t("question")}</h2>

      <div className="flex flex-col gap-3">
        <GuestLinkButton href={webHref} variant="primary">
          🌐 {t("webButton")}
        </GuestLinkButton>
        {telegramHref ? (
          <a
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            className={guestButtonClasses("secondary")}
          >
            ✈️ {t("telegramButton")}
          </a>
        ) : (
          <button type="button" disabled className={guestButtonClasses("secondary")}>
            ✈️ {t("telegramButton")}
          </button>
        )}
      </div>
      {!telegramHref && <p className="text-center text-sm text-text-muted">{t("telegramComingSoon")}</p>}
    </GuestShell>
  );
}

export default function GoPage() {
  return (
    <Suspense fallback={null}>
      <GoContent />
    </Suspense>
  );
}
