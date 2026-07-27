"""LLM — loyihaning YAGONA AI dvigateli (docs/07-ai-layer.md §3).

Har murojaat shu yerdan o'tadi: kategoriya, ustuvorlik, kayfiyat, xulosa va
javob drafti bitta JSON javobda qaytadi. Har qanday xato (dvigatel o'chiq,
timeout, buzuq JSON) `LlmError` ko'taradi — chaqiruvchi (worker) uni ushlab,
murojaatni qayta urinish navbatiga qo'yadi (docs/07 §2), admin navbatiga EMAS.

`LLM_PROVIDER` env orqali tanlanadi: "ollama" (standart, lokal) yoki
"deepseek" (API, vaqtincha — DeepSeek Ollama o'rnini bosadi, ikkalasi ham
xuddi shu `LlmAnalysis` sxemasini qaytaradi, worker bu farqni bilmaydi).
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
Faqat JSON qaytar. Kategoriyalar ro'yxati:
{categories}
Maydonlar:
- category_code: ASOSIY muammoning kategoriyasi, ro'yxatdan FAQAT bitta kod.
- secondary_category_codes: fuqaro bitta matnda BIR NECHTA ALOHIDA muammo \
yozgan bo'lsa, qolganlarining kodlari (ro'yxatdan, ko'pi bilan 3 ta). \
Masalan "chiroq va suv yo'q" — bu ikki xil xizmat: biri category_code, \
ikkinchisi shu ro'yxatda. Bitta muammo bo'lsa BO'SH ro'yxat [] qaytar. \
Umumlashtiruvchi kategoriya tanlab, alohida muammolarni bitta kodga \
yig'ib yuborma — har xizmatni alohida ko'rsat.
- confidence: 0..1 (asosiy kategoriyaga ishonch).
- priority: low|medium|high|critical (hayot/xavfsizlik tahdidi bo'lsa critical).
- sentiment: negative|neutral|positive.
- summary_uz: o'zbek lotin, max 2 gap.
- reply_draft_uz: rasmiy, xushmuomala javob loyihasi, 2-3 gap, \
"Hurmatli fuqaro" bilan boshlansin.
- tags: 3-6 ta qisqa teg.
Javobni FAQAT JSON obyekt sifatida qaytar, boshqa hech qanday matn yozma."""

# LLM ko'p kod qaytarsa ham shuncha olinadi: bitta murojaatni 3 tadan
# ortiq bo'limga bo'lish amaliy emas va odatda LLM adashganini bildiradi.
MAX_SECONDARY_CATEGORIES = 3

class LlmError(Exception):
    pass


class LlmAnalysis(BaseModel):
    category_code: str
    # v1.5 — ko'p bo'limli murojaat ([07] §1.1). Bu yerda faqat SHAKL
    # tozalanadi (bo'sh/takroriy qiymatlar, limit); kodning haqiqiyligi
    # va bo'limga bog'liqligi worker'da tekshiriladi — LLM'ga ishonib
    # to'g'ridan-to'g'ri topshiriq yaratib bo'lmaydi.
    secondary_category_codes: list[str] = []
    confidence: float = 0.5
    priority: str = "medium"
    sentiment: str = "neutral"
    summary_uz: str | None = None
    reply_draft_uz: str | None = None
    tags: list[str] = []

    @field_validator("secondary_category_codes", mode="before")
    @classmethod
    def _coerce_list(cls, value: object) -> list[str]:
        # Ba'zi modellar bitta string yoki null qaytaradi — sxema
        # buzilib butun tahlil yo'qolmasligi uchun yumshoq keltiramiz.
        if value is None:
            return []
        if isinstance(value, str):
            return [value]
        if isinstance(value, list):
            return [str(item) for item in value]
        return []

    @field_validator("secondary_category_codes")
    @classmethod
    def _clean_secondary(cls, value: list[str]) -> list[str]:
        seen: set[str] = set()
        cleaned: list[str] = []
        for code in value:
            code = code.strip().lower()
            if not code or code in seen:
                continue
            seen.add(code)
            cleaned.append(code)
        return cleaned[:MAX_SECONDARY_CATEGORIES]

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


def current_engine_and_model() -> tuple[str, str]:
    """Dashboard/`ai_analyses.model` uchun: qaysi provayder va model hozir
    faol (LLM_PROVIDER, docs/07 §3)."""
    if settings.llm_provider == "deepseek":
        return "deepseek", settings.deepseek_model
    return "ollama", settings.ollama_model


def _category_catalog(db: Session) -> str:
    """Kategoriya katalogi: kod, nom va (bo'lsa) chegara izohi.

    Izoh M15 da qo'shildi. Avval prompt faqat `kod: nom` yuborardi, ya'ni
    LLM chegaraviy holatni ikki so'zlik yorliqdan taxmin qilishi kerak edi:
    «ko'cha chiroqlari yonmayapti» uchun u «Yo'l va transport» va «Elektr
    energiyasi» dan birini tanlashi lozim, lekin ko'cha yoritishi kimning
    zimmasida ekani hech qayerda yozilmagan edi. Izoh aynan shu chegarani
    aytadi ("... KIRMAYDI -> boshqa_kod").

    docs/07 §1.1 promptni boshidanoq «kod — tavsif» deb ta'riflagan; bu
    yerda hujjat bilan kod nihoyat mos keldi. Izohi yo'q kategoriya
    avvalgidek faqat nom bilan chiqadi.
    """
    categories = (
        db.query(Category)
        .filter(Category.is_active.is_(True))
        .order_by(Category.sort_order)
        .all()
    )
    lines = []
    for c in categories:
        description = c.description("uz")
        lines.append(f"- {c.code}: {c.name('uz')}" + (f" — {description}" if description else ""))
    return "\n".join(lines)


def _call_ollama(messages: list[dict]) -> str:
    response = httpx.post(
        f"{settings.ollama_url}/api/chat",
        json={
            "model": settings.ollama_model,
            "messages": messages,
            "format": "json",
            "options": {"temperature": 0},
            "keep_alive": -1,
            "stream": False,
        },
        timeout=settings.llm_timeout_s,
    )
    response.raise_for_status()
    return response.json()["message"]["content"]


def _call_deepseek(messages: list[dict]) -> str:
    if not settings.deepseek_api_key:
        raise LlmError("DEEPSEEK_API_KEY berilmagan (LLM_PROVIDER=deepseek, backend/.env)")
    response = httpx.post(
        f"{settings.deepseek_base_url}/chat/completions",
        headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
        json={
            "model": settings.deepseek_model,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0,
            "stream": False,
        },
        timeout=settings.llm_timeout_s,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


def analyze_with_llm(db: Session, text: str, address: str | None = None) -> tuple[LlmAnalysis, int]:
    """Returns (analysis, latency_ms). `llm_max_attempts` urinishdan keyin
    ham bo'lmasa `LlmError` — worker qayta urinish navbatiga qo'yadi."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_TEMPLATE.format(categories=_category_catalog(db))},
        {"role": "user", "content": text if not address else f"{text}\n\nManzil: {address}"},
    ]
    call = _call_deepseek if settings.llm_provider == "deepseek" else _call_ollama
    engine_label = settings.deepseek_model if settings.llm_provider == "deepseek" else settings.ollama_model

    last_error: Exception | None = None
    for _ in range(settings.llm_max_attempts):
        started = time.monotonic()
        try:
            content = call(messages)
            result = LlmAnalysis.model_validate(json.loads(content))
            return result, int((time.monotonic() - started) * 1000)
        except (httpx.HTTPError, KeyError, json.JSONDecodeError) as exc:
            last_error = exc
        except Exception as exc:  # pydantic ValidationError et al.
            last_error = exc

    raise LlmError(
        f"{settings.llm_provider} {settings.llm_max_attempts} urinishdan keyin ham javob bermadi "
        f"(timeout {settings.llm_timeout_s:.0f}s, model {engine_label}): {last_error}"
    ) from last_error
