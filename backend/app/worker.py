"""ARQ worker. Run with: arq app.worker.WorkerSettings

Pipeline v3 (docs/07-ai-layer.md §1, v1.3): LLM YAGONA dvigatel.
`analyze_complaint` bitta ishda murojaatni o'qiydi, kategoriyalaydi,
ustuvorlik beradi, bo'limga yo'naltiradi va javob drafti yozadi —
inson aralashuvi kutilmaydi.

LLM javob bermasa admin navbati YO'Q: ish `AI_RETRY_DELAYS` bo'yicha qayta
navbatga qo'yiladi va har 15 daqiqada sweeper cron tahlilsiz qolgan
murojaatlarni qaytadan uradi (§2). Ollama tiklanganda navbat o'zi ketadi.

v1.4 (§2.3): qayta urinishlar tugagach murojaat `needs_review` belgisi
bilan `stuck_ai` navbatiga tushadi — bu tasdiqlash navbati emas, uzilish
signali. Sukut bo'yicha bo'sh bo'lishi kerak.
"""
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone

from arq import cron
from arq.connections import RedisSettings
from sqlalchemy import select

from app.config import get_settings
from app.core.constants import DEFAULT_CATEGORY_CODE, STATUS_AI_PROCESSED, STATUS_NEW
from app.database import SessionLocal
from app.models.ai_analysis import AiAnalysis
from app.models.category import Category
from app.models.complaint import Complaint
from app.models.complaint_event import ComplaintEvent
from app.models.complaint_subtask import ComplaintSubtask
from app.models.stt_job import SttJob
from app.models.user import User
from app.services.ai.llm import LlmError, analyze_with_llm, current_engine_and_model
from app.services.ai.stt import SttError, transcribe
from app.services import workflow
from app.services.deadline import compute_deadline
from app.services.escalation import escalate_overdue
from app.services.lifecycle import auto_archive_closed, auto_close_resolved
from app.services.notifications import notify_staff
from app.services.storage import download_to_temp

logger = logging.getLogger(__name__)
settings = get_settings()

# Ollama uzoq muddat o'chiq bo'lsa ham murojaat yo'qolmasin: 2 daq → 10 daq
# → 30 daq → 2 soat → 6 soat. Undan keyin sweeper cron baribir uradi.
AI_RETRY_DELAYS = [120, 600, 1800, 7200, 21600]

# Sweeper: shundan eski `new` murojaat = navbatdan tushib qolgan deb hisoblanadi
# (worker restart, Redis flush va h.k.).
STALE_AFTER = timedelta(minutes=10)

LLM_LAST_SUCCESS_KEY = "ai:llm_last_success"
LLM_ERROR_KEY_PREFIX = "ai:llm_err:"  # soatlik bucket: ai:llm_err:YYYYMMDDHH

# CPU'da bir vaqtda BITTA inference (docs/07 §3). Global `max_jobs=1` qilib
# bo'lmaydi — u STT'ni ham bloklardi, fuqaro esa ovoz natijasini kutib
# turadi. Shuning uchun qulf faqat LLM ishiga qo'yiladi.
LLM_LOCK_KEY = "ai:llm_lock"
LLM_LOCK_TTL = 900  # inference + zaxira; worker o'lsa qulf o'zi bo'shaydi
LLM_LOCK_RETRY_S = 30


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


def _create_ai_subtasks(
    db,
    complaint: Complaint,
    secondary_codes: list[str],
    primary_category: Category | None,
) -> int:
    """LLM topgan qo'shimcha muammolar uchun idoralararo topshiriq
    yaratadi (docs/07 §1.1). Yaratilganlar sonini qaytaradi.

    **LLM'ga ishonilmaydi.** U ro'yxatda yo'q kod, asosiy kategoriyaning
    o'zi yoki bo'limga bog'lanmagan kategoriya qaytarishi mumkin —
    hammasi shu yerda tozalanadi. Eng muhim filtr: **asosiy bo'lim
    bilan bir xil bo'limga tushadigan** kod tashlanadi, aks holda bitta
    jamoa o'z ishi uchun o'ziga topshiriq olardi.
    """
    if not secondary_codes:
        return 0

    primary_department_id = complaint.assigned_department_id or (
        primary_category.department_id if primary_category else None
    )
    primary_code = primary_category.code if primary_category else None

    created = 0
    used_departments: set[uuid.UUID] = set()
    for code in secondary_codes:
        if code == primary_code:
            continue
        secondary = db.execute(
            select(Category).where(Category.code == code, Category.is_active.is_(True))
        ).scalar_one_or_none()
        if secondary is None or secondary.department_id is None:
            continue
        if secondary.department_id == primary_department_id or secondary.department_id in used_departments:
            continue

        used_departments.add(secondary.department_id)
        subtask = ComplaintSubtask(
            complaint_id=complaint.id,
            department_id=secondary.department_id,
            note=f"AI aniqladi: murojaatda «{secondary.name('uz')}» bo'yicha ham alohida muammo bor.",
            # `created_by` yo'q — AI yaratgan (M10, [04] complaint_subtasks).
            deadline_at=complaint.deadline_at,
        )
        db.add(subtask)
        db.flush()

        db.add(
            ComplaintEvent(
                complaint_id=complaint.id,
                event_type="subtask_created",
                actor_type="ai",
                payload={
                    "subtask_id": str(subtask.id),
                    "department_id": str(secondary.department_id),
                    "category_code": secondary.code,
                },
            )
        )
        for user in db.execute(
            select(User).where(
                User.is_active.is_(True),
                User.role == "department_staff",
                User.department_id == secondary.department_id,
            )
        ).scalars():
            notify_staff(
                db,
                user,
                f"AI idoralararo topshiriq berdi ({secondary.name('uz')}): {complaint.ticket_number}",
                complaint_id=complaint.id,
            )
        created += 1

    if created:
        logger.info(
            "%s: AI %s ta qo'shimcha bo'limga topshiriq yaratdi", complaint.ticket_number, created
        )
    return created


async def analyze_complaint(ctx, complaint_id: str, attempt: int = 0) -> None:
    """LLM murojaatni to'liq hal qiladi: kategoriya + ustuvorlik + muddat +
    bo'limga yo'naltirish + xulosa/javob drafti. Xato bo'lsa qayta urinadi."""
    # Navbat ketma-ket: qulf band bo'lsa ish keyinroq qaytadi (bu urinish
    # sifatida sanalmaydi — server band, xato emas).
    got_lock = await ctx["redis"].set(LLM_LOCK_KEY, complaint_id, nx=True, ex=LLM_LOCK_TTL)
    if not got_lock:
        await ctx["redis"].enqueue_job(
            "analyze_complaint", complaint_id, attempt, _defer_by=timedelta(seconds=LLM_LOCK_RETRY_S)
        )
        return

    db = SessionLocal()
    try:
        complaint = db.get(Complaint, uuid.UUID(complaint_id))
        # Faqat hali tahlil qilinmagan murojaat (sweeper qayta urgan bo'lishi
        # mumkin — ikki marta tahlil qilmaymiz).
        if complaint is None or complaint.status != STATUS_NEW:
            return

        try:
            result, latency_ms = analyze_with_llm(db, complaint.description, complaint.address)
        except LlmError:
            await _mark_llm_error(ctx)
            # Admin navbati emas — qayta urinish (docs/07 §2). Murojaat `new`
            # holatida qoladi, ya'ni sweeper ham uni ko'radi.
            if attempt < len(AI_RETRY_DELAYS):
                await ctx["redis"].enqueue_job(
                    "analyze_complaint",
                    complaint_id,
                    attempt + 1,
                    _defer_by=timedelta(seconds=AI_RETRY_DELAYS[attempt]),
                )
            else:
                # v1.4 (docs/07 §2.3): qayta urinishlar tugadi — bu endi
                # «AI ikkilanmoqda» emas, «AI umuman javob bermadi».
                # `needs_review` belgisi qo'yiladi, murojaat `new` da
                # qoladi va `stuck_ai` navbatida ko'rinadi. Aks holda u
                # soatlab jim yotardi va buni hech kim bilmasdi.
                complaint.needs_review = True
                db.add(
                    ComplaintEvent(
                        complaint_id=complaint.id,
                        event_type="ai_processed",
                        actor_type="system",
                        payload={"engine": "llm", "failed": True, "attempts": attempt + 1},
                    )
                )
                db.commit()
                logger.warning(
                    "LLM %s murojaatni tahlil qila olmadi (%s urinish) — qo'lda yo'naltirish kerak",
                    complaint.ticket_number,
                    attempt + 1,
                )
            return

        await _mark_llm_success(ctx)

        _engine, _model = current_engine_and_model()
        category = db.execute(select(Category).where(Category.code == result.category_code)).scalar_one_or_none()
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
                confidence=result.confidence,
                priority=result.priority,
                sentiment=result.sentiment,
                summary=result.summary_uz,
                suggested_reply=result.reply_draft_uz,
                tags=result.tags,
                model=_model,
                latency_ms=latency_ms,
            )
        )

        if category is not None:
            complaint.category_id = category.id
            complaint.ai_category_id = category.id
        complaint.ai_confidence = result.confidence
        complaint.priority = result.priority
        # `needs_review` BLOKLAMAYDI (docs/07 §1) — bu faqat "AI o'zi
        # ikkilandi" belgisi: admin xohlasa keyin ko'radi, murojaat esa
        # baribir yo'naltiriladi va ijroga ketadi.
        complaint.needs_review = unknown_code or result.confidence < settings.ai_low_confidence
        complaint.status = STATUS_AI_PROCESSED

        if category is not None:
            complaint.deadline_at = compute_deadline(complaint.created_at, category.sla_hours, complaint.priority)

        db.add(
            ComplaintEvent(
                complaint_id=complaint.id,
                event_type="ai_processed",
                actor_type="ai",
                payload={
                    "engine": _engine,
                    "model": _model,
                    "confidence": result.confidence,
                    "needs_review": complaint.needs_review,
                    "latency_ms": latency_ms,
                },
            )
        )

        # Avtomatik yo'naltirish — past ishonchda ham (yo'naltirilmagan
        # murojaat = to'xtab qolgan murojaat).
        if category is not None and category.department_id:
            # `assigned_user_id` berilmaydi — v1.4 dan oldin bu yerda
            # ochiq `None` uzatilardi va AI qayta yo'naltirganda adminning
            # qo'lda tayinlagan xodimi jimgina yo'qolardi ([03] §5).
            workflow.assign(db, complaint, category.department_id, actor_type="ai")

        # v1.5: ko'p bo'limli murojaat — ikkinchi muammo ham bo'limiga
        # tushadi ([07] §1.1).
        if _create_ai_subtasks(db, complaint, result.secondary_category_codes, category):
            complaint.needs_review = True

        db.commit()
    finally:
        db.close()
        try:
            await ctx["redis"].delete(LLM_LOCK_KEY)
        except Exception:
            pass  # TTL baribir bo'shatadi


async def sweep_pending_analysis(ctx) -> None:
    """docs/07 §2 — "uxlab qolgan murojaat qolmaydi" kafolati: navbatdan
    tushib qolgan (worker restart, Redis tozalangan) yoki qayta urinishlari
    tugagan murojaatlarni qaytadan navbatga qo'yadi."""
    db = SessionLocal()
    try:
        cutoff = datetime.now(timezone.utc) - STALE_AFTER
        stale = (
            db.execute(select(Complaint.id).where(Complaint.status == STATUS_NEW, Complaint.created_at < cutoff))
            .scalars()
            .all()
        )
        for complaint_id in stale:
            await ctx["redis"].enqueue_job("analyze_complaint", str(complaint_id), 0)
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
    functions = [analyze_complaint, transcribe_audio]
    cron_jobs = [
        cron(sweep_pending_analysis, minute={0, 15, 30, 45}),
        cron(lifecycle_job, hour=3, minute=0),
        cron(escalate_overdue_job, minute={5, 35}),
    ]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    # LLM ketma-ketligi LLM_LOCK_KEY bilan ta'minlanadi (max_jobs emas —
    # STT ishlari parallel qolishi kerak).
    job_timeout = 1800
