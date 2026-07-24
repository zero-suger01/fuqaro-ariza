"""ARQ worker. Run with: arq app.worker.WorkerSettings

B1 scope: `classify_complaint` is keyword-only (docs/05-backend-tasklar.md
B1.7). The Ollama LLM fallback slots into the same job in B2.2/B2.3 without
changing the job name or signature.
"""
import uuid

from arq.connections import RedisSettings

from app.config import get_settings
from app.core.constants import STATUS_NEW
from app.database import SessionLocal
from app.models.ai_analysis import AiAnalysis
from app.models.category import Category
from app.models.complaint import Complaint
from app.models.complaint_event import ComplaintEvent
from app.services.ai.classifier import classify
from app.services.deadline import compute_deadline

settings = get_settings()


async def classify_complaint(ctx, complaint_id: str) -> None:
    db = SessionLocal()
    try:
        complaint = db.get(Complaint, uuid.UUID(complaint_id))
        if complaint is None or complaint.status != STATUS_NEW:
            return

        result = classify(db, complaint.description)

        db.add(
            AiAnalysis(
                complaint_id=complaint.id,
                engine="keyword",
                suggested_category_id=result.category_id,
                confidence=result.confidence,
            )
        )

        complaint.ai_category_id = result.category_id
        complaint.ai_confidence = result.confidence
        complaint.needs_review = result.needs_review
        complaint.status = "ai_processed"

        category = db.get(Category, complaint.category_id)
        if category is not None:
            complaint.deadline_at = compute_deadline(complaint.created_at, category.sla_hours, complaint.priority)

        db.add(
            ComplaintEvent(
                complaint_id=complaint.id,
                event_type="ai_processed",
                actor_type="ai",
                payload={"suggested_category": result.category_code, "confidence": result.confidence},
            )
        )
        db.commit()
    finally:
        db.close()


class WorkerSettings:
    functions = [classify_complaint]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
