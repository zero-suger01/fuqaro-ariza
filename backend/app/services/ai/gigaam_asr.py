"""GigaAM Multilingual (int8 ONNX) speech-to-text, run server-side via onnxruntime.

Ports the browser pipeline from the sibling `voice/` project (log-mel featurizer +
greedy CTC decode) from TypeScript to numpy so the exact same int8 ONNX graph can
run here instead of in a WASM worker. See `voice/lib/melSpectrogram.ts` and
`voice/lib/ctcDecode.ts` for the reference implementation this mirrors.
"""
import json
import wave
from pathlib import Path

import numpy as np
import onnxruntime as ort

from app.config import get_settings

settings = get_settings()


class GigaamAsrError(Exception):
    pass


def _hz_to_mel_htk(hz: float) -> float:
    return 2595.0 * np.log10(1.0 + hz / 700.0)


def _mel_to_hz_htk(mel: np.ndarray) -> np.ndarray:
    return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)


def _build_mel_filterbank(n_freqs: int, n_mels: int, sample_rate: int, f_min: float, f_max: float) -> np.ndarray:
    all_freqs = np.arange(n_freqs, dtype=np.float64) * (sample_rate / 2) / (n_freqs - 1)

    m_min, m_max = _hz_to_mel_htk(f_min), _hz_to_mel_htk(f_max)
    m_pts = np.linspace(m_min, m_max, n_mels + 2, dtype=np.float64)
    f_pts = _mel_to_hz_htk(m_pts)
    f_diff = np.diff(f_pts)

    down = (all_freqs[:, None] - f_pts[None, :-2]) / f_diff[None, :-1]
    up = (f_pts[None, 2:] - all_freqs[:, None]) / f_diff[None, 1:]
    return np.clip(np.minimum(down, up), 0, None).astype(np.float32)


def _periodic_hann(win_length: int, n_fft: int) -> np.ndarray:
    n = np.arange(win_length)
    win = 0.5 - 0.5 * np.cos(2 * np.pi * n / win_length)
    if win_length == n_fft:
        return win.astype(np.float32)
    framed = np.zeros(n_fft, dtype=np.float32)
    offset = (n_fft - win_length) // 2
    framed[offset:offset + win_length] = win
    return framed


class LogMelExtractor:
    def __init__(self, cfg: dict):
        self.cfg = cfg
        self.n_freqs = cfg["n_fft"] // 2 + 1
        self.window = _periodic_hann(cfg["win_length"], cfg["n_fft"])
        self.mel_fb = _build_mel_filterbank(
            self.n_freqs, cfg["n_mels"], cfg["sample_rate"], 0, cfg["sample_rate"] / 2
        )

    def extract(self, samples: np.ndarray) -> np.ndarray:
        """Returns [n_mels, n_frames] float32 log-mel features."""
        n_fft, hop, n_mels = self.cfg["n_fft"], self.cfg["hop_length"], self.cfg["n_mels"]
        if self.cfg.get("center"):
            pad = n_fft // 2
            samples = np.pad(samples, (pad, pad), mode="reflect")

        n_frames = max(0, (len(samples) - n_fft) // hop + 1)
        if n_frames == 0:
            return np.zeros((n_mels, 0), dtype=np.float32)

        frames = np.stack([samples[t * hop: t * hop + n_fft] for t in range(n_frames)])
        frames = frames * self.window
        spectrum = np.fft.rfft(frames, n=n_fft, axis=1)
        power = (spectrum.real ** 2 + spectrum.imag ** 2).astype(np.float32)  # [n_frames, n_freqs]

        mel = power @ self.mel_fb  # [n_frames, n_mels]
        mel = np.log(np.clip(mel, 1e-9, 1e9))
        return mel.T.astype(np.float32)  # [n_mels, n_frames]


def _ctc_greedy_decode(log_probs: np.ndarray, valid_length: int, vocab: list[str], blank_id: int) -> str:
    length = min(valid_length, log_probs.shape[0])
    best_ids = np.argmax(log_probs[:length], axis=1)

    chars: list[str] = []
    prev = -1
    for label in best_ids:
        label = int(label)
        if label != blank_id and label != prev:
            chars.append(vocab[label])
        prev = label
    return "".join(chars)


def _read_wav_mono16k(wav_path: str) -> np.ndarray:
    with wave.open(wav_path, "rb") as wf:
        if wf.getframerate() != 16000 or wf.getnchannels() != 1:
            raise GigaamAsrError(
                f"Kutilmagan wav format: {wf.getframerate()}Hz/{wf.getnchannels()}ch (16000Hz/mono kerak)"
            )
        raw = wf.readframes(wf.getnframes())
    samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    return samples


_extractor: LogMelExtractor | None = None
_session: ort.InferenceSession | None = None
_vocab: list[str] | None = None
_blank_id: int | None = None


def _model_dir() -> Path:
    configured = settings.gigaam_model_dir
    if not configured:
        raise GigaamAsrError("GIGAAM_MODEL_DIR sozlanmagan")
    return Path(configured)


def _load():
    global _extractor, _session, _vocab, _blank_id
    if _session is not None:
        return

    model_dir = _model_dir()
    manifest_path = model_dir / "manifest.json"
    if not manifest_path.exists():
        raise GigaamAsrError(f"manifest.json topilmadi: {manifest_path}")
    manifest = json.loads(manifest_path.read_text())

    onnx_file = manifest["variants"][0]["onnx_file"]
    onnx_path = model_dir / onnx_file
    if not onnx_path.exists():
        raise GigaamAsrError(f"ONNX model topilmadi: {onnx_path}")

    _extractor = LogMelExtractor(manifest["featurizer"])
    _vocab = manifest["vocab"]["vocab"]
    _blank_id = manifest["vocab"]["blank_id"]
    _session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])


def transcribe_gigaam(wav_path: str) -> str:
    _load()
    assert _extractor is not None and _session is not None and _vocab is not None and _blank_id is not None

    samples = _read_wav_mono16k(wav_path)
    features = _extractor.extract(samples)  # [n_mels, n_frames]
    n_frames = features.shape[1]
    if n_frames == 0:
        return ""

    features_input = features[None, :, :]  # [1, n_mels, n_frames]
    lengths_input = np.array([n_frames], dtype=np.int64)

    outputs = _session.run(
        ["log_probs", "encoded_lengths"],
        {"features": features_input, "feature_lengths": lengths_input},
    )
    log_probs, encoded_lengths = outputs
    valid_length = int(encoded_lengths[0])

    return _ctc_greedy_decode(log_probs[0], valid_length, _vocab, _blank_id)
