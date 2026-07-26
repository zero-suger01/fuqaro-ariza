"use client";

import { useRef, useState } from "react";
import { Plus, Video as VideoIcon, X } from "lucide-react";
import { useTranslations } from "next-intl";

const MAX_IMAGES = 5;
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB — client-side guard, checked before upload

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime"];

/** Unified photo + video attachment grid: existing thumbnails plus a
 * trailing "+" tile to add more, instead of a separate text button that's
 * easy to miss once at least one photo is already attached. */
export function MediaPicker({
  images,
  onImagesChange,
  video,
  onVideoChange,
}: {
  images: File[];
  onImagesChange: (images: File[]) => void;
  video: File | null;
  onVideoChange: (video: File | null) => void;
}) {
  const t = useTranslations("wizard.step1");
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const canAddMore = images.length < MAX_IMAGES || video === null;

  function handleFiles(files: FileList | null) {
    if (!files) return;
    let nextImages = images;
    let nextVideo = video;
    let errorMessage: string | null = null;

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) {
        errorMessage = t("fileTooLarge");
        continue;
      }
      if (VIDEO_TYPES.includes(file.type)) {
        if (nextVideo !== null) {
          errorMessage = t("maxVideoError");
          continue;
        }
        nextVideo = file;
      } else {
        if (nextImages.length >= MAX_IMAGES) {
          errorMessage = t("maxPhotosError");
          continue;
        }
        nextImages = [...nextImages, file];
      }
    }

    onImagesChange(nextImages);
    onVideoChange(nextVideo);
    setError(errorMessage);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeImageAt(index: number) {
    onImagesChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")}
        multiple
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((file, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-inner border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeImageAt(i)}
              aria-label={t("removePhoto")}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}

        {video && (
          <div className="relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-inner border border-border bg-bg-subtle">
            <VideoIcon className="h-7 w-7 text-text-secondary" aria-hidden />
            <span className="max-w-full truncate px-2 text-xs text-text-muted">{video.name}</span>
            <button
              type="button"
              onClick={() => onVideoChange(null)}
              aria-label={t("removePhoto")}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}

        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label={t("mediaButton")}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-inner border-2 border-dashed border-border-strong bg-bg-surface text-text-secondary transition-colors hover:bg-bg-subtle"
          >
            <Plus className="h-7 w-7" aria-hidden />
            {images.length === 0 && !video && (
              <span className="px-2 text-center text-xs font-medium leading-tight">{t("mediaButton")}</span>
            )}
          </button>
        )}
      </div>

      {error && <p className="text-base text-danger">{error}</p>}
      <p className="text-base text-text-muted">{t("maxPhotosNote")}</p>
    </div>
  );
}
