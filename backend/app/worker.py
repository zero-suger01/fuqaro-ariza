"""ARQ worker. Run with: arq app.worker.WorkerSettings

Pipeline (docs/07-ai-layer.md §1): keyword classify -> if not confident,
Ollama LLM -> whichever engine "won" updates the complaint; both runs are
always recorded in ai_analyses for KPI comparison. LLM failure never blocks
the pipeline — it just leaves needs_review=True on the keyword result.
"""
import os
import uuid
from datetime import datetime, timezone

from arq import cron
from arq.connections import RedisSettings
from sqlalchemy import select

from app.config import get_settings
from app.core.constants import DEFAULT_CATEGORY_CODE, STATUS_NEW
from app.database import SessionLocal
from app.models.ai_analysis import AiAnalysis
from app.models.category import Category
from app.models.complaint import Complaint
from app.models.complaint_event import ComplaintEvent
from app.models.stt_job import SttJob
from app.services.ai.classifier import classify
from app.services.ai.learning import mine_keyword_suggestions
from app.services.ai.llm import LlmError, classify_with_llm
from app.services.ai.stt import SttError, transcribe
from app.services import workflow
from app.services.deadline import compute_deadline
from app.services.escalation import escalate_overdue
from app.services.storage import download_to_temp

settings = get_settings()


async def classify_complaint(ctx, complaint_id: str) -> None:
    db = SessionLocal()
    try:
        complaint = db.get(Complaint, uuid.UUID(complaint_id))
        if complaint is None or complaint.status != STATUS_NEW:
            return

        keyword_result = classify(db, complaint.description)
        db.add(
            AiAnalysis(
                complaint_id=complaint.id,
                engine="keyword",
                suggested_category_id=keyword_result.category_id,
                confidence=keyword_result.confidence,
                priority=keyword_result.priority,
            )
        )

        final_category_id = keyword_result.category_id
        final_confidence = keyword_result.confidence
        final_priority = keyword_result.priority
        needs_review = not keyword_result.confident
        engine_used = "keyword"

        if not keyword_result.confident:
            try:
                llm_result, latency_ms = classify_with_llm(db, complaint.description, complaint.address)
                category = db.execute(
                    select(Category).where(Category.code == llm_result.category_code)
                ).scalar_one_or_none()
                if category is None:
                    category = db.execute(
                        select(Category).where(Category.code == DEFAULT_CATEGORY_CODE)
                    ).scalar_one_or_none()
                    needs_review = True
                else:
                    needs_review = False

                db.add(
                    AiAnalysis(
                        complaint_id=complaint.id,
                        engine="llm",
                        suggested_category_id=category.id if category else None,
                        confidence=llm_result.confidence,
                        priority=llm_result.priority,
                        sentiment=llm_result.sentiment,
                        summary=llm_result.summary_uz,
                        suggested_reply=llm_result.reply_draft_uz,
                        tags=llm_result.tags,
                        model=settings.ollama_model,
                        latency_ms=latency_ms,
                    )
                )

                if category is not None:
                    final_category_id = category.id
                final_confidence = llm_result.confidence
                final_priority = llm_result.priority
                engine_used = "llm"
            except LlmError:
                # Ollama unreachable/broken — keep the keyword result, just
                # flagged for a human (docs/07-ai-layer.md §1 right branch).
                needs_review = True

        complaint.category_id = final_category_id or complaint.category_id
        complaint.ai_category_id = final_category_id
        complaint.ai_confidence = final_confidence
        complaint.priority = final_priority
        complaint.needs_review = needs_review
        complaint.status = "ai_processed"

        category = db.get(Category, complaint.category_id)
        if category is not None:
            complaint.deadline_at = compute_deadline(complaint.created_at, category.sla_hours, complaint.priority)

        db.add(
            ComplaintEvent(
                complaint_id=complaint.id,
                event_type="ai_processed",
                actor_type="ai",
                payload={"engine": engine_used, "confidence": final_confidence, "needs_review": needs_review},
            )
        )

        # B6 avto-routing: AI ishonchli bo'lsa (needs_review=False) va
        # kategoriya real bo'limga bog'langan bo'lsa, murojaat admin
        # kutmasdan avtomatik shu bo'limga biriktiriladi (docs/03 §6 workflow).
        # Ishonchsiz holatlar biriktirilmagan qoladi — admin panelidagi
        # needs_review navbatida qo'lda yo'naltiriladi.
        if not needs_review and category is not None and category.department_id:
            workflow.assign(db, complaint, category.department_id, None, actor_type="ai")

        db.commit()
    finally:
        db.close()


async def suggest_keywords_job(ctx) -> None:
    db = SessionLocal()
    try:
        mine_keyword_suggestions(db)
    finally:
        db.close()


async def escalate_overdue_job(ctx) -> None:
    db = SessionLocal()
    try:
        escalate_overdue(db)
    finally:
        db.close()


async def transcribe_audio(ctx, job_id: str) -> None:
    db = SessionLocal()
    local_path = None
    try:
        job = db.get(SttJob, uuid.UUID(job_id))
        if job is None or job.status != "pending":
            return
        try:
            local_path = download_to_temp(job.audio_url)
            job.text = transcribe(local_path, job.language)
            job.status = "done"
        except SttError as exc:
            job.status = "failed"
            job.error = str(exc)[:200]
        job.finished_at = datetime.now(timezone.utc)
        db.commit()
    finally:
        if local_path:
            try:
                os.unlink(local_path)
            except OSError:
                pass
        db.close()


class WorkerSettings:
    functions = [classify_complaint, transcribe_audio]
    cron_jobs = [
        cron(suggest_keywords_job, hour=2, minute=0),
        cron(escalate_overdue_job, minute={0, 30}),
    ]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
