"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { GuestButton } from "@/components/guest/GuestButton";
import { MediaPicker } from "@/components/wizard/MediaPicker";
import { VoiceRecorder } from "@/components/wizard/VoiceRecorder";
import { apiGet, apiPostForm } from "@/lib/api";
import { detectCategoryCode } from "@/lib/categoryKeywords";
import type { PublicCategory, SttJobCreated, SttJobStatus } from "@/lib/types";

const MIN_DESCRIPTION_LENGTH = 10;
const DETECT_DEBOUNCE_MS = 600;
const STT_POLL_INTERVAL_MS = 1000;
const STT_POLL_TIMEOUT_MS = 20_000;

export function Step1Problem({
  description,
  onDescriptionChange,
  audio,
  onAudioChange,
  images,
  onImagesChange,
  video,
  onVideoChange,
  categoryCode,
  onCategoryChange,
  categories,
  onNext,
}: {
  description: string;
  onDescriptionChange: (value: string) => void;
  audio: Blob | null;
  onAudioChange: (value: Blob | null) => void;
  images: File[];
  onImagesChange: (value: File[]) => void;
  video: File | null;
  onVideoChange: (value: File | null) => void;
  categoryCode: string | null;
  onCategoryChange: (value: string | null) => void;
  categories: PublicCategory[];
  onNext: () => void;
}) {
  const t = useTranslations("wizard.step1");
  const tWizard = useTranslations("wizard");
  const [touched, setTouched] = useState(false);

  // Whether the current categoryCode came from live auto-detection (keeps
  // updating as the citizen types/records) vs. a manual pick from the
  // dropdown (locked until they switch back to the "AI aniqlaydi" option).
  const autoDetectedRef = useRef(true);
  const voiceTranscriptRef = useRef("");

  // A voice message stands on its own — the backend transcribes and
  // analyzes it in the background, so it doesn't need to also clear the
  // typed-text length floor (matches app/routers/public.py's check).
  const canContinue = description.trim().length >= MIN_DESCRIPTION_LENGTH || audio !== null;

  function runDetection() {
    if (!autoDetectedRef.current) return;
    const combined = `${description} ${voiceTranscriptRef.current}`;
    const detected = detectCategoryCode(combined);
    onCategoryChange(detected);
  }

  // Live detection from typed text — debounced so it doesn't run on every
  // keystroke (docs/07: the real LLM classifier is far too slow — 2-6 min
  // on CPU — for a live-as-you-type call, so this is a fast local heuristic
  // preview only; the real classification still runs after submission).
  useEffect(() => {
    const timer = setTimeout(runDetection, DETECT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description]);

  // Live detection from voice — transcribes in the background (GigaAM,
  // a few seconds) purely to feed the keyword matcher. The transcript is
  // never shown or written into the description field.
  useEffect(() => {
    if (!audio) {
      voiceTranscriptRef.current = "";
      runDetection();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const formData = new FormData();
        formData.append("audio", audio, "voice.webm");
        formData.append("language", "uz");
        const job = await apiPostForm<SttJobCreated>("/api/public/stt", formData);

        const start = Date.now();
        while (!cancelled && Date.now() - start < STT_POLL_TIMEOUT_MS) {
          const status = await apiGet<SttJobStatus>(`/api/public/stt/${job.job_id}`);
          if (status.status === "done") {
            if (!cancelled) {
              voiceTranscriptRef.current = status.text ?? "";
              runDetection();
            }
            return;
          }
          if (status.status === "failed") return;
          await new Promise((resolve) => setTimeout(resolve, STT_POLL_INTERVAL_MS));
        }
      } catch {
        // Best-effort preview only — a failed/slow transcription just means
        // no voice-based suggestion this time, not a submission blocker.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio]);

  return (
    <div className="flex flex-col gap-5">
      <textarea
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={t("placeholder")}
        rows={6}
        className="w-full rounded-card border-2 border-border-strong bg-bg-surface p-4 text-lg leading-relaxed text-text-primary outline-none focus:border-accent"
      />
      {touched && !canContinue && <p className="text-base text-danger">{t("minLengthError")}</p>}

      <VoiceRecorder audio={audio} onAudioChange={onAudioChange} />

      <MediaPicker images={images} onImagesChange={onImagesChange} video={video} onVideoChange={onVideoChange} />

      {categories.length > 0 && (
        <div className="flex flex-col gap-2 rounded-card border border-border bg-bg-surface px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden />
            <h2 className="text-lg font-semibold text-text-primary">{t("categoryLabel")}</h2>
          </div>
          <p className="text-base text-text-secondary">{t("categoryAuto")}</p>
          <select
            value={categoryCode ?? ""}
            onChange={(e) => {
              const value = e.target.value || null;
              autoDetectedRef.current = value === null;
              onCategoryChange(value);
            }}
            className="min-h-[56px] w-full rounded-control border-2 border-border-strong bg-bg-surface px-4 text-lg text-text-primary outline-none focus:border-accent"
          >
            <option value="">{t("categoryAutoOption")}</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

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
