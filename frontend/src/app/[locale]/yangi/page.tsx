"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { GuestShell } from "@/components/guest/GuestShell";
import { WizardProgress } from "@/components/wizard/WizardProgress";
import { DraftPrompt } from "@/components/wizard/DraftPrompt";
import { Step1Problem } from "@/components/wizard/Step1Problem";
import { Step2Location } from "@/components/wizard/Step2Location";
import { Step3Contact } from "@/components/wizard/Step3Contact";
import { SuccessScreen } from "@/components/wizard/SuccessScreen";
import { AnalyzingScreen } from "@/components/wizard/AnalyzingScreen";
import { apiGet, apiPostForm } from "@/lib/api";
import { toE164 } from "@/lib/phone";
import { useAiRouting } from "@/lib/useAiRouting";
import { EMPTY_DRAFT, clearDraft, loadDraft, saveDraft, type WizardDraft } from "@/lib/wizardDraft";
import type { ComplaintSubmitResponse, PublicCategory, PublicNeighborhood, QrLanding } from "@/lib/types";
import { ApiError } from "@/lib/api";

function WizardContent() {
  const t = useTranslations("wizard");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const qrCode = searchParams.get("qr");

  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<PublicNeighborhood[]>([]);

  const [draft, setDraft] = useState<WizardDraft>(EMPTY_DRAFT);
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [audio, setAudio] = useState<Blob | null>(null);

  const [pendingDraft, setPendingDraft] = useState<WizardDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<ComplaintSubmitResponse | null>(null);
  const aiRouting = useAiRouting(result?.ticket_number ?? null);

  useEffect(() => {
    apiGet<PublicCategory[]>(`/api/public/categories?lang=${locale}`)
      .then(setCategories)
      .catch(() => setCategories([]));
    apiGet<PublicNeighborhood[]>("/api/public/neighborhoods")
      .then(setNeighborhoods)
      .catch(() => setNeighborhoods([]));
  }, [locale]);

  useEffect(() => {
    // QR plakat orqali kelingan bo'lsa (docs/06-frontend-tasklar.md F3.1)
    // mahallani oldindan tanlab qo'yamiz — fuqaro Step2'da qayta qidirmaydi.
    if (!qrCode) return;
    apiGet<QrLanding>(`/api/public/qr/${encodeURIComponent(qrCode)}`)
      .then((res) => {
        if (res.neighborhood_id) {
          setDraft((prev) => ({ ...prev, neighborhoodId: res.neighborhood_id! }));
        }
      })
      .catch(() => {
        // Noto'g'ri/eskirgan QR kod — wizard oddiy holatda davom etadi.
      });
  }, [qrCode]);

  useEffect(() => {
    // localStorage is client-only; this must run post-mount (not during the
    // lazy-init render pass) to avoid an SSR/client hydration mismatch.
    const existing = loadDraft();
    if (existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingDraft(existing);
    }
  }, []);

  useEffect(() => {
    if (result) return;
    saveDraft(draft);
  }, [draft, result]);

  function updateDraft(patch: Partial<WizardDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const formData = new FormData();
      formData.append("description", draft.description);
      formData.append("first_name", draft.firstName);
      if (draft.lastName) formData.append("last_name", draft.lastName);
      formData.append("phone", toE164(draft.phoneDigits));
      formData.append("language", locale);
      formData.append("source", qrCode ? "qr" : "web");
      if (qrCode) formData.append("qr_code", qrCode);
      if (draft.categoryCode) formData.append("category_code", draft.categoryCode);
      if (draft.address) formData.append("address", draft.address);
      if (draft.neighborhoodId) formData.append("neighborhood_id", draft.neighborhoodId);
      if (draft.latitude != null) formData.append("latitude", String(draft.latitude));
      if (draft.longitude != null) formData.append("longitude", String(draft.longitude));
      images.forEach((file) => formData.append("images", file));
      if (video) formData.append("video", video);
      if (audio) formData.append("audio", audio, "voice.webm");

      const response = await apiPostForm<ComplaintSubmitResponse>("/api/public/complaints", formData);
      setResult(response);
      clearDraft();
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError(t("error.network"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    if (aiRouting.status === "polling") {
      return (
        <GuestShell>
          <AnalyzingScreen />
        </GuestShell>
      );
    }
    return (
      <GuestShell>
        <SuccessScreen
          ticketNumber={result.ticket_number}
          department={aiRouting.status === "routed" ? aiRouting.department : null}
        />
      </GuestShell>
    );
  }

  return (
    <GuestShell>
      {pendingDraft && (
        <DraftPrompt
          onResume={() => {
            setDraft(pendingDraft);
            setPendingDraft(null);
          }}
          onDiscard={() => {
            clearDraft();
            setPendingDraft(null);
          }}
        />
      )}

      {!pendingDraft && (
        <>
          <WizardProgress step={draft.step} />

          {draft.step === 1 && (
            <Step1Problem
              description={draft.description}
              onDescriptionChange={(description) => updateDraft({ description })}
              audio={audio}
              onAudioChange={setAudio}
              images={images}
              onImagesChange={setImages}
              video={video}
              onVideoChange={setVideo}
              categoryCode={draft.categoryCode}
              onCategoryChange={(categoryCode) => updateDraft({ categoryCode })}
              categories={categories}
              onNext={() => updateDraft({ step: 2 })}
            />
          )}

          {draft.step === 2 && (
            <Step2Location
              neighborhoods={neighborhoods}
              neighborhoodId={draft.neighborhoodId}
              onNeighborhoodChange={(neighborhoodId) => updateDraft({ neighborhoodId })}
              address={draft.address}
              onAddressChange={(address) => updateDraft({ address })}
              latitude={draft.latitude}
              longitude={draft.longitude}
              onLocationChange={(latitude, longitude) => updateDraft({ latitude, longitude })}
              onBack={() => updateDraft({ step: 1 })}
              onNext={() => updateDraft({ step: 3 })}
            />
          )}

          {draft.step === 3 && (
            <Step3Contact
              firstName={draft.firstName}
              onFirstNameChange={(firstName) => updateDraft({ firstName })}
              lastName={draft.lastName}
              onLastNameChange={(lastName) => updateDraft({ lastName })}
              phoneDigits={draft.phoneDigits}
              onPhoneDigitsChange={(phoneDigits) => updateDraft({ phoneDigits })}
              submitting={submitting}
              submitError={submitError}
              onBack={() => updateDraft({ step: 2 })}
              onSubmit={handleSubmit}
            />
          )}
        </>
      )}
    </GuestShell>
  );
}

export default function WizardPage() {
  return (
    <Suspense fallback={null}>
      <WizardContent />
    </Suspense>
  );
}
