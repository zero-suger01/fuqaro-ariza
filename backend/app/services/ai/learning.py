"""Daily keyword-learning pass (docs/07-ai-layer.md §5): mine complaints the
LLM had to resolve for candidate keywords the dictionary doesn't know yet,
and queue the ones that keep showing up into `keyword_suggestions` for an
admin to approve.
"""
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, aliased

from app.models.ai_analysis import AiAnalysis
from app.models.complaint import Complaint
from app.models.keyword import CategoryKeyword
from app.models.keyword_suggestion import KeywordSuggestion
from app.services.ai.normalize import candidate_phrases, normalize

MIN_OCCURRENCES = 2
MAX_SAMPLES = 5
MIN_PHRASE_LEN = 3

_STOPWORD_WORDS = [
    "va", "bilan", "uchun", "bu", "bir", "ham", "yoki", "lekin", "juda", "endi",
    "hozir", "shu", "u", "men", "biz", "siz", "ular", "bor", "yoq", "kerak",
    "iltimos", "i", "v", "na", "s", "po", "dlya", "eto", "chto", "kak", "ne",
    "da", "net", "ya", "on", "ona", "oni", "menga", "bizga", "uni", "buni",
]
STOPWORDS = {normalize(word) for word in _STOPWORD_WORDS}


def mine_keyword_suggestions(db: Session, since: datetime | None = None) -> int:
    since = since or (datetime.now(timezone.utc) - timedelta(hours=24))

    known_keywords = {row[0] for row in db.execute(select(CategoryKeyword.keyword_norm))}

    # R0 (docs/07 §5.2): LLM-always rejimida engine=llm yozuvi HAR murojaatda
    # bor — nomzodlar faqat keyword ojiz qolgan (confident=false) murojaatlardan
    # olinadi, aks holda lug'at allaqachon biladigan so'zlar taklifga to'ladi.
    # confident IS NULL (M7'dan oldingi eski yozuvlar) ham kirmaydi.
    keyword_run = aliased(AiAnalysis)
    keyword_not_confident = (
        select(keyword_run.id)
        .where(
            keyword_run.complaint_id == Complaint.id,
            keyword_run.engine == "keyword",
            keyword_run.confident.is_(False),
        )
        .exists()
    )
    rows = db.execute(
        select(AiAnalysis, Complaint)
        .join(Complaint, AiAnalysis.complaint_id == Complaint.id)
        .where(
            AiAnalysis.engine == "llm",
            AiAnalysis.created_at >= since,
            AiAnalysis.suggested_category_id.isnot(None),
            keyword_not_confident,
        )
    ).all()

    candidates: dict[tuple[str, uuid.UUID], set[uuid.UUID]] = defaultdict(set)
    for analysis, complaint in rows:
        normalized = normalize(complaint.description)
        for phrase in candidate_phrases(normalized):
            if len(phrase) < MIN_PHRASE_LEN or phrase in STOPWORDS or phrase in known_keywords:
                continue
            candidates[(phrase, analysis.suggested_category_id)].add(complaint.id)

    written = 0
    for (phrase, category_id), complaint_ids in candidates.items():
        if len(complaint_ids) < MIN_OCCURRENCES:
            continue
        existing = db.execute(
            select(KeywordSuggestion).where(
                KeywordSuggestion.phrase_norm == phrase, KeywordSuggestion.suggested_category_id == category_id
            )
        ).scalar_one_or_none()
        sample_ids = [str(cid) for cid in list(complaint_ids)[:MAX_SAMPLES]]

        if existing is None:
            db.add(
                KeywordSuggestion(
                    phrase_norm=phrase,
                    suggested_category_id=category_id,
                    occurrences=len(complaint_ids),
                    sample_complaint_ids=sample_ids,
                    status="pending",
                )
            )
            written += 1
        elif existing.status == "pending":
            existing.occurrences = max(existing.occurrences, len(complaint_ids))
            existing.sample_complaint_ids = sample_ids
            written += 1

    db.commit()
    return written
