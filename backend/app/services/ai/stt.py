"""Speech-to-text provider interface (docs/07-ai-layer.md §6). Swappable via
`STT_PROVIDER` without touching callers: `transcribe(audio_path, language)`.
"""
import subprocess
import tempfile
from pathlib import Path

from app.config import get_settings

settings = get_settings()

_LANGUAGE_HINT = {"uz": "uz", "oz": "uz", "ru": "ru", "en": "en"}


class SttError(Exception):
    pass


def _to_16k_mono_wav(input_path: str) -> str:
    output_path = tempfile.mktemp(suffix=".wav")
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", input_path, "-ar", "16000", "-ac", "1", output_path],
        capture_output=True,
    )
    if result.returncode != 0:
        raise SttError(f"ffmpeg konvertatsiya xatosi: {result.stderr.decode(errors='ignore')[:300]}")
    return output_path


_whisper_model = None


def _whisper() -> "WhisperModel":  # noqa: F821 - forward ref, imported lazily
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel

        _whisper_model = WhisperModel(settings.stt_whisper_model, device="cpu", compute_type="int8")
    return _whisper_model


def _transcribe_whisper(wav_path: str, language: str) -> str:
    segments, _ = _whisper().transcribe(wav_path, language=_LANGUAGE_HINT.get(language, "uz"))
    return " ".join(segment.text.strip() for segment in segments).strip()


def _transcribe_mohirai(wav_path: str, language: str) -> str:
    if not settings.mohirai_api_key:
        raise SttError("MOHIRAI_API_KEY sozlanmagan")
    raise SttError("mohir.ai provayderi hali ulanmagan")


def _transcribe_gigaam(wav_path: str, language: str) -> str:
    from app.services.ai.gigaam_asr import GigaamAsrError, transcribe_gigaam

    try:
        return transcribe_gigaam(wav_path)
    except GigaamAsrError as e:
        raise SttError(str(e)) from e


def transcribe(audio_path: str, language: str = "uz") -> str:
    wav_path = _to_16k_mono_wav(audio_path)
    try:
        if settings.stt_provider == "mohirai":
            return _transcribe_mohirai(wav_path, language)
        if settings.stt_provider == "gigaam":
            return _transcribe_gigaam(wav_path, language)
        return _transcribe_whisper(wav_path, language)
    finally:
        Path(wav_path).unlink(missing_ok=True)
