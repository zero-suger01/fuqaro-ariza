"use client";

import { useRef } from "react";
import { Camera, X } from "lucide-react";
import { useTranslations } from "next-intl";

const MAX_IMAGES = 5;

export function ImagePicker({
  images,
  onChange,
}: {
  images: File[];
  onChange: (images: File[]) => void;
}) {
  const t = useTranslations("wizard.step1");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const next = [...images, ...Array.from(files)].slice(0, MAX_IMAGES);
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={images.length >= MAX_IMAGES}
        className="flex min-h-[56px] w-full items-center justify-center gap-3 rounded-card border-2 border-border-strong bg-bg-surface px-6 py-4 text-lg font-semibold text-text-primary transition-colors hover:bg-bg-subtle disabled:opacity-50"
      >
        <Camera className="h-6 w-6" aria-hidden />
        {t("photoButton")}
      </button>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((file, i) => (
            <div key={i} className="relative h-20 w-20 flex-none overflow-hidden rounded-inner border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={t("removePhoto")}
                className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-base text-text-muted">{t("maxPhotosNote")}</p>
    </div>
  );
}
