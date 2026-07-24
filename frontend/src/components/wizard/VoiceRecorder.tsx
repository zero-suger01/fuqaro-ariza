"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { clsx } from "clsx";
import { apiGet, apiPostForm } from "@/lib/api";
import type { SttJobCreated, SttJobStatus } from "@/lib/types";

const MAX_SECONDS = 120;
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 90_000;

function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined"
  );
}

export function VoiceRecorder({
  language,
  onTranscribed,
}: {
  language: string;
  onTranscribed: (text: string) => void;
}) {
  const t = useTranslations("wizard");
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
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

  async function pollJob(jobId: string): Promise<string | null> {
    const start = Date.now();
    while (Date.now() - start < POLL_TIMEOUT_MS) {
      const status = await apiGet<SttJobStatus>(`/api/public/stt/${jobId}`);
      if (status.status === "done") return status.text;
      if (status.status === "failed") return null;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    return null;
  }

  async function transcribe(blob: Blob) {
    setTranscribing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "voice.webm");
      formData.append("language", language);
      const job = await apiPostForm<SttJobCreated>("/api/public/stt", formData);
      const text = await pollJob(job.job_id);
      if (text) {
        onTranscribed(text);
      } else {
        setError(t("error.generic"));
      }
    } catch {
      setError(t("error.generic"));
    } finally {
      setTranscribing(false);
    }
  }

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
          void transcribe(blob);
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

  if (transcribing) {
    return (
      <div className="flex w-full items-center justify-center gap-3 rounded-card border-2 border-border-strong px-6 py-4 text-lg text-text-secondary">
        <span className="h-3 w-3 animate-pulse rounded-full bg-accent" aria-hidden />
        {t("step1.transcribing")}
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
