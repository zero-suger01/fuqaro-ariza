"""Keyword classifier v2 — DB-backed dictionary with margin/threshold
scoring and a danger-keyword priority heuristic (docs/07-ai-layer.md §3).

`confident=False` tells the caller (the `classify_complaint` worker,
B2.3) to fall back to the LLM. This module never calls the LLM itself.
"""
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.constants import DEFAULT_CATEGORY_CODE
from app.models.category import Category
from app.models.keyword import CategoryKeyword
from app.models.setting import Setting
from app.services.ai.normalize import candidate_phrases, normalize

MARGIN_THRESHOLD = 2
DEFAULT_DANGER_KEYWORDS = ["portlash", "gaz hidi", "sim uzilgan", "toshqin", "avariya"]


@dataclass
class ClassificationResult:
    category_id: uuid.UUID | None
    category_code: str
    confidence: float
    priority: str
    confident: bool


def _danger_keywords(db: Session) -> list[str]:
    setting = db.get(Setting, "danger_keywords")
    raw = setting.value if setting and isinstance(setting.value, list) else DEFAULT_DANGER_KEYWORDS
    return [normalize(word) for word in raw]


def _heuristic_priority(candidates: set[str], db: Session) -> str:
    danger_keywords = _danger_keywords(db)
    return "high" if any(word in candidates for word in danger_keywords) else "medium"


def classify(db: Session, text: str) -> ClassificationResult:
    normalized = normalize(text)
    candidates = candidate_phrases(normalized)
    priority = _heuristic_priority(candidates, db)

    rows = db.execute(select(CategoryKeyword.category_id, CategoryKeyword.keyword_norm, CategoryKeyword.weight)).all()
    scores: dict[uuid.UUID, int] = {}
    for category_id, keyword_norm, weight in rows:
        if keyword_norm not in candidates:
            continue
        hit_weight = weight * 2 if " " in keyword_norm else weight
        scores[category_id] = scores.get(category_id, 0) + hit_weight

    if not scores:
        default = db.execute(select(Category).where(Category.code == DEFAULT_CATEGORY_CODE)).scalar_one_or_none()
        return ClassificationResult(
            category_id=default.id if default else None,
            category_code=DEFAULT_CATEGORY_CODE,
            confidence=0.35,
            priority=priority,
            confident=False,
        )

    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    best_id, top1 = ranked[0]
    top2 = ranked[1][1] if len(ranked) > 1 else 0

    confidence = round(min(0.99, top1 / (top1 + top2 + 1)), 2)
    margin_ok = (top1 - top2) >= MARGIN_THRESHOLD
    confident = confidence >= get_settings().ai_confidence_threshold and margin_ok

    category = db.get(Category, best_id)
    return ClassificationResult(
        category_id=best_id,
        category_code=category.code if category else DEFAULT_CATEGORY_CODE,
        confidence=confidence,
        priority=priority,
        confident=confident,
    )
