"""ARQ worker. Run with: arq app.worker.WorkerSettings

Pipeline v2 (docs/07-ai-layer.md §1, R0): ikki bosqich.
1) `classify_complaint` — keyword ROUTING (millisekund): kategoriya, priority,
   deadline; ishonchli bo'lsa avto-assign. Har doim 2-bosqichni navbatga qo'yadi.
2) `generate_analysis` — LLM GENERATSIYA har murojaatda: summary, javob drafti,
   sentiment, teglar; keyword ishonchsiz bo'lgan holatda routing'ni ham hal qiladi.

`needs_review` FAQAT "routing insonga muhtoj" degani: keyword ishonchli bo'lsa
LLM xatosi uni true qilmaydi (draft'siz degradatsiya — blokirovka emas).
"""
import os
import uuid
from datetime import datetime, timezone

from arq import cron
from arq.connections import RedisSettings
from sqlalchemy import select

from app.config import get_settings
from app.core.constants import (
    DEFAULT_CATEGORY_CODE,
    PRIORITIES,
    STATUS_AI_PROCESSED,
    STATUS_NEW,
    TERMINAL_STATUSES,
)
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
from app.services.lifecycle import auto_archive_closed, auto_close_resolved
from app.services.storage import download_to_temp

settings = get_settings()

PRIORITY_RANK = {p: i for i, p in enumerate(PRIORITIES)}

# AI-health kalitlari (GET /api/admin/stats/ai-health shularni o'qiydi).
LLM_LAST_SUCCESS_KEY = "ai:llm_last_success"
LLM_ERROR_KEY_PREFIX = "ai:llm_err:"  # soatlik bucket: ai:llm_err:YYYYMMDDHH


async def _mark_llm_success(ctx) -> None:
    try:
        await ctx["redis"].set(LLM_LAST_SUCCESS_KEY, datetime.now(timezone.utc).isoformat())
    except Exception:
        pass  # health-marker yiqilishi pipeline'ni to'xtatmasin


async def _mark_llm_error(ctx) -> None:
    try:
        key = f"{LLM_ERROR_KEY_PREFIX}{datetime.now(timezone.utc):%Y%m%d%H}"
        await ctx["redis"].incr(key)
        await ctx["redis"].expire(key, 7200)
    except Exception:
        pass


async def classify_complaint(ctx, complaint_id: str) -> None:
    """1-bosqich: keyword routing. LLM'ni KUTMAYDI — ishonchli bo'lsa murojaat
    bir zumda bo'limga tushadi, generatsiya orqadan yetib keladi."""
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
                confident=keyword_result.confident,
                priority=keyword_result.priority,
            )
        )

        complaint.category_id = keyword_result.category_id or complaint.category_id
        complaint.ai_category_id = keyword_result.category_id
        complaint.ai_confidence = keyword_result.confidence
        complaint.priority = keyword_result.priority
        # needs_review = "routing insonga muhtoj". Ishonchsiz bo'lsa hozircha
        # true — 2-bosqichda LLM routing'ni hal qilsa false'ga tushadi.
        complaint.needs_review = not keyword_result.confident
        complaint.status = STATUS_AI_PROCESSED

        category = db.get(Category, complaint.category_id)
        if category is not None:
            complaint.deadline_at = compute_deadline(complaint.created_at, category.sla_hours, complaint.priority)

        db.add(
            ComplaintEvent(
                complaint_id=complaint.id,
                event_type="ai_processed",
                actor_type="ai",
                payload={
                    "engine": "keyword",
                    "confidence": keyword_result.confidence,
                    "confident": keyword_result.confident,
                    "needs_review": complaint.needs_review,
                },
            )
        )

        # B6 avto-routing: keyword ishonchli va kategoriya bo'limga bog'langan
        # bo'lsa — admin kutilmaydi (docs/03 §5 assign izohi).
        if keyword_result.confident and category is not None and category.department_id:
            workflow.assign(db, complaint, category.department_id, None, actor_type="ai")

        db.commit()
    finally:
        db.close()

    # 2-bosqich HAR DOIM navbatga qo'yiladi (LLM-always, docs/07 §1).
    await ctx["redis"].enqueue_job("generate_analysis", complaint_id)


async def generate_analysis(ctx, complaint_id: str) -> None:
    """2-bosqich: LLM generatsiya (summary/draft/sentiment/teglar) + keyword
    ishonchsiz bo'lgan murojaatlarda routing. Qarorlar jadvali: docs/07 §1."""
    db = SessionLocal()
    try:
        complaint = db.get(Complaint, uuid.UUID(complaint_id))
        if complaint is None or complaint.status in TERMINAL_STATUSES:
            return

        keyword_row = (
            db.execute(
                select(AiAnalysis)
                .where(AiAnalysis.complaint_id == complaint.id, AiAnalysis.engine == "keyword")
                .order_by(AiAnalysis.created_at.desc())
            )
            .scalars()
            .first()
        )
        keyword_confident = bool(keyword_row.confident) if keyword_row else False

        try:
            llm_result, latency_ms = classify_with_llm(db, complaint.description, complaint.address)
        except LlmError:
            await _mark_llm_error(ctx)
            # Keyword ishonchli: routing buzilmagan — needs_review=False qoladi.
            # Keyword ishonchsiz: 1-bosqich qo'ygan needs_review=True qoladi.
            return

        await _mark_llm_success(ctx)

        category = db.execute(
            select(Category).where(Category.code == llm_result.category_code)
        ).scalar_one_or_none()
        unknown_code = category is None
        if unknown_code:
            category = db.execute(
                select(Category).where(Category.code == DEFAULT_CATEGORY_CODE)
            ).scalar_one_or_none()

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

        # Priority faqat KO'TARILADI (docs/07 §1) — deadline ham qattiqlashadi.
        if PRIORITY_RANK.get(llm_result.priority, 0) > PRIORITY_RANK.get(complaint.priority, 0):
            complaint.priority = llm_result.priority
            current_category = db.get(Category, complaint.category_id)
            if current_category is not None:
                complaint.deadline_at = compute_deadline(
                    complaint.created_at, current_category.sla_hours, complaint.priority
                )

        if keyword_confident:
            # Routing keyword'niki. LLM boshqa kategoriya desa — biriktirish
            # QOLADI, lekin admin Tasdiqlash navbatida tekshiradi.
            if not unknown_code and category is not None and category.id != complaint.category_id:
                complaint.needs_review = True
        elif complaint.status == STATUS_AI_PROCESSED and complaint.assigned_department_id is None:
            # Routing'ni LLM hal qiladi (1-bosqich biriktirmagan, admin ham
            # hali aralashmagan).
            if category is not None:
                complaint.category_id = category.id
                complaint.ai_category_id = category.id
                complaint.ai_confidence = llm_result.confidence
                complaint.needs_review = unknown_code
                complaint.deadline_at = compute_deadline(
                    complaint.created_at, category.sla_hours, complaint.priority
                )
                if not unknown_code and category.department_id:
                    workflow.assign(db, complaint, category.department_id, None, actor_type="ai")
        # else: admin allaqachon aralashgan (qo'lda biriktirgan/status o'zgargan)
        # — routing'ga tegilmaydi, faqat generatsiya natijasi saqlanadi.

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


async def lifecycle_job(ctx) -> None:
    """R0/Q4: resolved 7 kundan keyin closed, closed 30 kundan keyin archived
    (docs/03 §2.1 — "7 kun sukut" endi haqiqatan ishlaydi)."""
    db = SessionLocal()
    try:
        auto_close_resolved(db)
        auto_archive_closed(db)
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
    functions = [classify_complaint, generate_analysis, transcribe_audio]
    cron_jobs = [
        cron(suggest_keywords_job, hour=2, minute=0),
        cron(lifecycle_job, hour=3, minute=0),
        cron(escalate_overdue_job, minute={0, 30}),
    ]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
