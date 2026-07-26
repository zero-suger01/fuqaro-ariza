"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { clsx } from "clsx";
import { GuestButton } from "@/components/guest/GuestButton";
import { GuestPageTitle } from "@/components/guest/GuestPageTitle";
import type { PublicNeighborhood } from "@/lib/types";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

// Uychi shahri (tuman markazi), Namangan viloyati — 41.0294°N 71.8483°E
// (https://en.wikipedia.org/wiki/Uychi). Oldingi qiymat (40.9856, 71.1533)
// noto'g'ri edi — Chust tumaniga to'g'ri kelardi, ~70km g'arbda.
const UYCHI_CENTER: [number, number] = [41.0294, 71.8483];

export function Step2Location({
  neighborhoods,
  neighborhoodId,
  onNeighborhoodChange,
  address,
  onAddressChange,
  latitude,
  longitude,
  onLocationChange,
  onBack,
  onNext,
}: {
  neighborhoods: PublicNeighborhood[];
  neighborhoodId: string | null;
  onNeighborhoodChange: (id: string | null) => void;
  address: string;
  onAddressChange: (value: string) => void;
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("wizard.step2");
  const tWizard = useTranslations("wizard");
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  const onLocationChangeRef = useRef(onLocationChange);
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    // The complaint is almost always about wherever the citizen currently
    // is, so pre-fill the pin from GPS instead of always defaulting to the
    // district center — they only need to touch the map if it's wrong.
    if (latitude != null && longitude != null) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        onLocationChangeRef.current(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setLocating(false);
        setLocationDenied(true);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
    // Runs once on mount only — re-running on every latitude/longitude
    // change (e.g. after the citizen manually repositions the pin) would
    // fight their edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return neighborhoods;
    return neighborhoods.filter((n) => n.name.toLowerCase().includes(q));
  }, [neighborhoods, query]);

  return (
    <div className="flex flex-col gap-5">
      <GuestPageTitle icon={MapPin}>{t("title")}</GuestPageTitle>

      <MapPicker
        lat={latitude ?? UYCHI_CENTER[0]}
        lng={longitude ?? UYCHI_CENTER[1]}
        onChange={onLocationChange}
      />
      {locating && <p className="text-base text-text-muted">{t("locating")}</p>}
      {locationDenied && <p className="text-base text-text-muted">{t("locationDenied")}</p>}

      <div className="flex flex-col gap-2">
        <label className="text-base font-medium text-text-secondary">{t("neighborhoodLabel")}</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("neighborhoodPlaceholder")}
            className="min-h-[56px] w-full rounded-control border-2 border-border-strong bg-bg-surface pl-12 pr-4 text-lg text-text-primary outline-none focus:border-accent"
          />
        </div>
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-control border border-border p-1">
          {filtered.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onNeighborhoodChange(n.id)}
              className={clsx(
                "rounded-control px-4 py-3 text-left text-lg",
                n.id === neighborhoodId ? "bg-accent-soft font-semibold text-accent" : "text-text-primary hover:bg-bg-subtle"
              )}
            >
              {n.name}
            </button>
          ))}
          {filtered.length === 0 && <p className="px-4 py-3 text-base text-text-muted">—</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-base font-medium text-text-secondary">{t("addressLabel")}</label>
        <input
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder={t("addressPlaceholder")}
          className="min-h-[56px] w-full rounded-control border-2 border-border-strong bg-bg-surface px-4 text-lg text-text-primary outline-none focus:border-accent"
        />
      </div>

      <div className="flex gap-3">
        <GuestButton type="button" variant="secondary" onClick={onBack} className="flex-1">
          {tWizard("back")}
        </GuestButton>
        <GuestButton type="button" onClick={onNext} className="flex-[2]">
          {tWizard("continueButton")}
        </GuestButton>
      </div>
    </div>
  );
}
