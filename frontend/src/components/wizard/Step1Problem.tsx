"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GuestButton } from "@/components/guest/GuestButton";
import { MediaPicker } from "@/components/wizard/MediaPicker";
import { VoiceRecorder } from "@/components/wizard/VoiceRecorder";

const MIN_DESCRIPTION_LENGTH = 10;

/**
 * 1-qadam — «Muammoni ayting».
 *
 * Muammo turini tanlash bloki OLIB TASHLANDI (v1.8). Sabablari:
 *
 * - **Tesler:** murakkablikni tizim yutishi kerak, fuqaro emas. 22 ta
 *   byurokratik toifadan iborat ro'yxat — aynan AI bartaraf qilishi kerak
 *   bo'lgan yuk. Malohat opa (72 yosh) uchun «Chiqindi va obodonlashtirish»
 *   bilan «Uy-joy va kommunal xizmatlar» orasidagi farqni tanlash
 *   muammoni aytishdan qiyinroq edi.
 * - `category_code` kontraktda ixtiyoriy (docs/03 §3.1), backend esa
 *   baribir o'zi tasniflaydi: worker `complaint.category_id` ni AI natijasi
 *   bilan qayta yozadi (`app/worker.py`). Ya'ni bu maydon amalda vaqtinchalik
 *   yorliqdan boshqa narsa emasdi.
 *
 * Shu bilan birga butun bir yashirin zanjir ham yo'qoldi: matndan
 * `detectCategoryCode` keyword taxmini va **ovozni oldindan STT'ga
 * yuborish**. Ikkinchisi ovoz faylini `/api/public/stt` ga yuklab, 20
 * soniyagacha so'rov qilib turardi — va bularning YAGONA maqsadi shu
 * select'ni oldindan tanlab qo'yish edi (transkript hech qachon
 * ko'rsatilmasdi). Sekin qishloq internetida bu bekorga ketgan yuklama
 * edi; haqiqiy STT va tasnif baribir yuborilgandan keyin serverda
 * ishlaydi (docs/07 §1).
 */
export function Step1Problem({
  description,
  onDescriptionChange,
  audio,
  onAudioChange,
  images,
  onImagesChange,
  video,
  onVideoChange,
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
  onNext: () => void;
}) {
  const t = useTranslations("wizard.step1");
  const tWizard = useTranslations("wizard");
  const [touched, setTouched] = useState(false);

  // A voice message stands on its own — the backend transcribes and
  // analyzes it in the background, so it doesn't need to also clear the
  // typed-text length floor (matches app/routers/public.py's check).
  const canContinue = description.trim().length >= MIN_DESCRIPTION_LENGTH || audio !== null;

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
