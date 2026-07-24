"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { clsx } from "clsx";
import { GuestButton } from "@/components/guest/GuestButton";
import { ImagePicker } from "@/components/wizard/ImagePicker";
import { VoiceRecorder } from "@/components/wizard/VoiceRecorder";
import type { PublicCategory } from "@/lib/types";

const MIN_DESCRIPTION_LENGTH = 10;

export function Step1Problem({
  description,
  onDescriptionChange,
  images,
  onImagesChange,
  video,
  onVideoChange,
  categoryCode,
  onCategoryChange,
  categories,
  language,
  onNext,
}: {
  description: string;
  onDescriptionChange: (value: string) => void;
  images: File[];
  onImagesChange: (value: File[]) => void;
  video: File | null;
  onVideoChange: (value: File | null) => void;
  categoryCode: string | null;
  onCategoryChange: (value: string | null) => void;
  categories: PublicCategory[];
  language: string;
  onNext: () => void;
}) {
  const t = useTranslations("wizard.step1");
  const tWizard = useTranslations("wizard");
  const [showMore, setShowMore] = useState(false);
  const [touched, setTouched] = useState(false);

  const canContinue = description.trim().length >= MIN_DESCRIPTION_LENGTH;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-bold leading-snug text-text-primary">{t("title")}</h1>

      <textarea
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={t("placeholder")}
        rows={6}
        className="w-full rounded-card border-2 border-border-strong bg-bg-surface p-4 text-lg leading-relaxed text-text-primary outline-none focus:border-accent"
      />
      {touched && !canContinue && <p className="text-base text-danger">{t("minLengthError")}</p>}

      <VoiceRecorder
        language={language}
        onTranscribed={(text) => {
          onDescriptionChange(description ? `${description} ${text}` : text);
        }}
      />

      <ImagePicker images={images} onChange={onImagesChange} />

      <div className="rounded-card border border-border bg-bg-surface">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-lg font-medium text-text-primary"
        >
          {t("moreOptions")}
          <ChevronDown className={clsx("h-5 w-5 transition-transform", showMore && "rotate-180")} aria-hidden />
        </button>
        {showMore && (
          <div className="flex flex-col gap-4 border-t border-border px-5 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-base font-medium text-text-secondary">{t("categoryLabel")}</label>
              <select
                value={categoryCode ?? ""}
                onChange={(e) => onCategoryChange(e.target.value || null)}
                className="min-h-[56px] w-full rounded-control border-2 border-border-strong bg-bg-surface px-4 text-lg text-text-primary outline-none focus:border-accent"
              >
                <option value="">{t("categoryAuto")}</option>
                {categories.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-base font-medium text-text-secondary">{t("videoLabel")}</label>
              <input
                type="file"
                accept="video/mp4,video/quicktime"
                onChange={(e) => onVideoChange(e.target.files?.[0] ?? null)}
                className="text-base text-text-secondary"
              />
              {video && (
                <button
                  type="button"
                  onClick={() => onVideoChange(null)}
                  className="self-start text-base text-danger underline"
                >
                  {t("removePhoto")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <GuestButton
        onClick={() => {
          setTouched(true);
          if (canContinue) onNext();
        }}
        disabled={!canContinue}
      >
        {tWizard("continueButton")}
      </GuestButton>
    </div>
  );
}
