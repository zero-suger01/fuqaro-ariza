"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { FileEdit, MapPin, User } from "lucide-react";
import { GuestShell } from "@/components/guest/GuestShell";
import { WizardHeader } from "@/components/wizard/WizardHeader";
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
import type { ComplaintSubmitResponse, PublicNeighborhood, QrLanding } from "@/lib/types";
import { ApiError } from "@/lib/api";

const STEP_ICONS = [FileEdit, MapPin, User];

function WizardContent() {
  const t = useTranslations("wizard");
  const tStep1 = useTranslations("wizard.step1");
  const tStep2 = useTranslations("wizard.step2");
  const tStep3 = useTranslations("wizard.step3");
  const stepTitles = [tStep1("title"), tStep2("title"), tStep3("title")];
  const locale = useLocale();
  const searchParams = useSearchParams();
  const qrCode = searchParams.get("qr");

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

  // AI natijasi kelgan zahoti SuccessScreen'ga sakramaymiz — fuqaro 3-bosqich
  // ("... bo'limiga yuborildi") matnini AnalyzingScreen'da ko'rishi uchun
  // qisqa pauza beramiz (docs/10-ui-ux.md §2.9, mijoz so'ragan).
  // `aiRouting.status` o'zgarishiga render paytida moslashtiramiz ("you
  // might not need an effect" andozasi) — timer esa alohida effektda,
  // faqat kechikib (asinxron) o'chiradi, shuning uchun
  // react-hooks/set-state-in-effect qoidasiga zid emas.
  const CONFIRM_HOLD_MS = 1800;
  const [prevRoutingStatus, setPrevRoutingStatus] = useState(aiRouting.status);
  const [confirmPending, setConfirmPending] = useState(false);
  if (aiRouting.status !== prevRoutingStatus) {
    setPrevRoutingStatus(aiRouting.status);
    if (aiRouting.status === "routed") setConfirmPending(true);
  }
  useEffect(() => {
    if (!confirmPending) return;
    const timer = setTimeout(() => setConfirmPending(false), CONFIRM_HOLD_MS);
    return () => clearTimeout(timer);
  }, [confirmPending]);

  // `/api/public/categories` endi chaqirilmaydi: toifa ro'yxati faqat
  // 1-qadamdagi «Muammo turi» select'i uchun kerak edi, u esa olib
  // tashlandi (Step1Problem izohiga qarang) — tasnifni AI o'zi qiladi.
  useEffect(() => {
    apiGet<PublicNeighborhood[]>("/api/public/neighborhoods")
      .then(setNeighborhoods)
      .catch(() => setNeighborhoods([]));
  }, []);

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
    if (aiRouting.status === "polling" || (aiRouting.status === "routed" && confirmPending)) {
      return (
        <GuestShell>
          <AnalyzingScreen
            confirmed={aiRouting.status === "routed"}
            department={aiRouting.status === "routed" ? aiRouting.department : null}
          />
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
          <WizardHeader step={draft.step} icons={STEP_ICONS} title={stepTitles[draft.step - 1]} />

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
