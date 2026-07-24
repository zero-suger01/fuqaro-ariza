"""Keyword classifier v1 — DB-backed dictionary, no LLM fallback yet.

This is the "hozircha keyword-only" version called out in
docs/05-backend-tasklar.md B1.7. The full v2 (margin/threshold scoring +
Ollama fallback) is B2.1/B2.2 in docs/07-ai-layer.md §3-4 and will extend
`classify()` without changing its return shape or callers.
"""
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.keyword import CategoryKeyword
from app.services.ai.normalize import candidate_phrases, normalize

DEFAULT_CATEGORY_CODE = "boshqa"
NEEDS_REVIEW_THRESHOLD = 0.6


@dataclass
class ClassificationResult:
    category_id: uuid.UUID | None
    category_code: str
    confidence: float
    needs_review: bool


def classify(db: Session, text: str) -> ClassificationResult:
    normalized = normalize(text)
    candidates = candidate_phrases(normalized)

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
            needs_review=True,
        )

    best_id = max(scores, key=lambda c: scores[c])
    total = sum(scores.values())
    confidence = round(min(0.99, scores[best_id] / total), 2)
    category = db.get(Category, best_id)
    return ClassificationResult(
        category_id=best_id,
        category_code=category.code if category else DEFAULT_CATEGORY_CODE,
        confidence=confidence,
        needs_review=confidence < NEEDS_REVIEW_THRESHOLD,
    )
