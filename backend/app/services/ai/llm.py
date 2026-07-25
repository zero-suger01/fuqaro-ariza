"""Ollama (Gemma) — loyihaning YAGONA AI dvigateli (docs/07-ai-layer.md §3).

Har murojaat shu yerdan o'tadi: kategoriya, ustuvorlik, kayfiyat, xulosa va
javob drafti bitta JSON javobda qaytadi. Har qanday xato (Ollama o'chiq,
timeout, buzuq JSON) `LlmError` ko'taradi — chaqiruvchi (worker) uni ushlab,
murojaatni qayta urinish navbatiga qo'yadi (docs/07 §2), admin navbatiga EMAS.
"""
import json
import time

import httpx
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.constants import PRIORITIES, SENTIMENTS
from app.models.category import Category

settings = get_settings()

SYSTEM_PROMPT_TEMPLATE = """Sen O'zbekiston tuman hokimligi murojaatlarini tasniflovchi yordamchisan.
Fuqaro matni o'zbek (lotin/kirill/sheva), rus yoki ingliz tilida bo'lishi mumkin.
Faqat JSON qaytar. Kategoriyalardan FAQAT bittasini tanla:
{categories}
Maydonlar: category_code, confidence (0..1), priority (low|medium|high|critical — \
hayot/xavfsizlik tahdidi bo'lsa critical), sentiment (negative|neutral|positive), \
summary_uz (o'zbek lotin, max 2 gap), reply_draft_uz (rasmiy, xushmuomala javob \
loyihasi, 2-3 gap, "Hurmatli fuqaro" bilan boshlansin), tags (3-6 ta qisqa teg).
Javobni FAQAT JSON obyekt sifatida qaytar, boshqa hech qanday matn yozma."""

class LlmError(Exception):
    pass


class LlmAnalysis(BaseModel):
    category_code: str
    confidence: float = 0.5
    priority: str = "medium"
    sentiment: str = "neutral"
    summary_uz: str | None = None
    reply_draft_uz: str | None = None
    tags: list[str] = []

    @field_validator("priority")
    @classmethod
    def _valid_priority(cls, value: str) -> str:
        return value if value in PRIORITIES else "medium"

    @field_validator("sentiment")
    @classmethod
    def _valid_sentiment(cls, value: str) -> str:
        return value if value in SENTIMENTS else "neutral"

    @field_validator("confidence")
    @classmethod
    def _clamp_confidence(cls, value: float) -> float:
        return max(0.0, min(1.0, value))


def _category_catalog(db: Session) -> str:
    categories = db.query(Category).filter(Category.is_active.is_(True)).order_by(Category.sort_order).all()
    return "\n".join(f"- {c.code}: {c.name('uz')}" for c in categories)


def analyze_with_llm(db: Session, text: str, address: str | None = None) -> tuple[LlmAnalysis, int]:
    """Returns (analysis, latency_ms). `llm_max_attempts` urinishdan keyin
    ham bo'lmasa `LlmError` — worker qayta urinish navbatiga qo'yadi."""
    payload = {
        "model": settings.ollama_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT_TEMPLATE.format(categories=_category_catalog(db))},
            {"role": "user", "content": text if not address else f"{text}\n\nManzil: {address}"},
        ],
        "format": "json",
        "options": {"temperature": 0},
        "keep_alive": -1,
        "stream": False,
    }

    last_error: Exception | None = None
    for _ in range(settings.llm_max_attempts):
        started = time.monotonic()
        try:
            response = httpx.post(
                f"{settings.ollama_url}/api/chat", json=payload, timeout=settings.llm_timeout_s
            )
            response.raise_for_status()
            content = response.json()["message"]["content"]
            result = LlmAnalysis.model_validate(json.loads(content))
            return result, int((time.monotonic() - started) * 1000)
        except (httpx.HTTPError, KeyError, json.JSONDecodeError) as exc:
            last_error = exc
        except Exception as exc:  # pydantic ValidationError et al.
            last_error = exc

    raise LlmError(
        f"Ollama {settings.llm_max_attempts} urinishdan keyin ham javob bermadi "
        f"(timeout {settings.llm_timeout_s:.0f}s, model {settings.ollama_model}): {last_error}"
    ) from last_error
