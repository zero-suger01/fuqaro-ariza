"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { clsx } from "clsx";

const MAX_SECONDS = 120;

function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined"
  );
}

/** Records a voice message and hands the raw Blob up to the wizard — it's
 * submitted alongside the complaint as its own audio file (kind="audio"),
 * never dictated into the description textarea. Transcription (for AI
 * classification + staff readback) happens server-side after submit. */
export function VoiceRecorder({
  audio,
  onAudioChange,
}: {
  audio: Blob | null;
  onAudioChange: (blob: Blob | null) => void;
}) {
  const t = useTranslations("wizard");
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // MediaRecorder/getUserMedia are undefined during SSR, so feature
    // detection must run post-mount to avoid a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(isRecordingSupported());
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const previewUrl = useMemo(() => (audio ? URL.createObjectURL(audio) : null), [audio]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    mediaRecorderRef.current?.stop();
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.addEventListener(
        "stop",
        () => {
          stream.getTracks().forEach((track) => track.stop());
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          onAudioChange(blob);
        },
        { once: true }
      );

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          if (next >= MAX_SECONDS) stopRecording();
          return next;
        });
      }, 1000);
    } catch {
      setError(t("step1.voiceNotSupported"));
    }
  }

  if (!supported) return null;

  if (audio && previewUrl && !recording) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-card border-2 border-border-strong bg-bg-surface px-4 py-3">
          <audio controls src={previewUrl} className="h-10 flex-1" />
          <button
            type="button"
            onClick={() => onAudioChange(null)}
            aria-label={t("step1.removeVoice")}
            className="flex h-10 w-10 items-center justify-center rounded-control text-danger hover:bg-danger/10"
          >
            <Trash2 className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {error && <p className="text-base text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        className={clsx(
          "flex min-h-[56px] w-full items-center justify-center gap-3 rounded-card px-6 py-4 text-lg font-semibold transition-colors",
          recording
            ? "bg-danger text-white"
            : "bg-bg-surface text-text-primary border-2 border-border-strong hover:bg-bg-subtle"
        )}
      >
        {recording ? (
          <>
            <Square className="h-6 w-6" aria-hidden />
            {t("step1.stopRecording")} · {seconds}s
          </>
        ) : (
          <>
            <Mic className="h-6 w-6" aria-hidden />
            {t("step1.voiceButton")}
          </>
        )}
      </button>
      {error && <p className="text-base text-danger">{error}</p>}
    </div>
  );
}
