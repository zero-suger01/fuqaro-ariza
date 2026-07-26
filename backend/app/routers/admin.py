import io
import secrets
import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from difflib import SequenceMatcher

import httpx
from fastapi import APIRouter, Depends, Query, Response
from openpyxl import Workbook
from openpyxl.styles import Font
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.core.constants import (
    STATUS_AI_PROCESSED,
    STATUS_ASSIGNED,
    STATUS_IN_PROGRESS,
    STATUS_NEW,
    STATUS_RESOLVED,
    TERMINAL_STATUSES,
)
from app.core.redisdb import redis_client
from app.core.timezone import day_bounds_utc, format_local
from app.core.deps import get_current_admin, get_current_staff_up
from app.core.errors import AppError
from app.core.security import hash_password
from app.database import get_db
from app.i18n.messages import reply_text as sms_reply_text
from app.models.ai_analysis import AiAnalysis
from app.services.ai.llm import current_engine_and_model
from app.models.audit_log import AuditLog
from app.models.category import Category
from app.models.citizen import Citizen
from app.models.citizen_message import CitizenMessage  # noqa: F401  (relationship yuklanishi uchun)
from app.models.complaint import Complaint
from app.models.complaint_event import ComplaintEvent
from app.models.complaint_subtask import ComplaintSubtask
from app.models.department import Department
from app.models.neighborhood import Neighborhood
from app.models.qr_code import QrCode
from app.models.reply import Reply
from app.models.user import User
from app.schemas.admin import (
    AiAnalysisOut,
    AiHealthOut,
    AiListBrief,
    AssignRequest,
    AuditLogOut,
    CategoryAdminOut,
    CategoryIn,
    CategoryPatch,
    CitizenBrief,
    CitizenInfoIn,
    CitizenMessageOut,
    CommentIn,
    ComplaintDetail,
    ComplaintListItem,
    DashboardStats,
    DepartmentBrief,
    DepartmentIn,
    DepartmentOut,
    DepartmentQueueRow,
    AiTrendPoint,
    DepartmentPatch,
    EventOut,
    FileOut,
    HeatmapPoint,
    KpiRow,
    MapPoint,
    NeighborhoodStat,
    OpenSubtaskBrief,
    QrCodeIn,
    QrCodeOut,
    QueueStats,
    ReplyIn,
    ReplyOut,
    ReviewRequest,
    StatusUpdateRequest,
    SubtaskIn,
    SubtaskOut,
    SubtaskUpdate,
    UserAdminOut,
    UserIn,
    UserPatch,
)
from app.schemas.common import Page
from app.schemas.public import CategoryBrief
from app.services import citizen_info, queues, workflow
from app.services.deadline import compute_deadline
from app.services.notifications import notify_citizen, notify_staff
from app.services.qr import generate_poster_pdf, generate_qr_png
from app.services.storage import upload_object

settings = get_settings()
router = APIRouter(prefix="/api/admin", tags=["admin"])

# RBAC matrix (docs/03-kontraktlar.md §5). None = no restriction beyond role gate.
# "assigned" endi bu yerda yo'q — bo'limga biriktirish/qayta yo'naltirish B6'dan
# beri faqat admin ishi (AI avtomatik yo'naltiradi, admin xato bo'lsa to'g'irlaydi).
# "accepted" — docs/03-kontraktlar.md §2.1 aynan "bo'lim xodimi" deb belgilagan
# (bo'lim murojaatni qabul qilib, ish boshlashini tasdiqlaydi).
ROLE_ALLOWED_STATUSES = {
    "department_staff": {"accepted", "in_progress", "need_info", "resolved", "rejected", "closed"},
    "admin": None,
}
DEPARTMENT_SCOPED_ROLES = ("department_staff",)


def _check_status_permission(staff: User, new_status: str) -> None:
    allowed = ROLE_ALLOWED_STATUSES.get(staff.role)
    if allowed is not None and new_status not in allowed:
        raise AppError(403, "forbidden", "Bu holatga o'tkazish uchun huquqingiz yetarli emas")


def _check_department_access(complaint: Complaint, staff: User) -> None:
    if staff.role in DEPARTMENT_SCOPED_ROLES and complaint.assigned_department_id != staff.department_id:
        raise AppError(403, "forbidden", "Bu murojaat sizning bo'limingizga tegishli emas")


def _category_brief(category: Category) -> CategoryBrief:
    return CategoryBrief(code=category.code, name=category.name("uz"))


def _department_brief(department: Department) -> DepartmentBrief:
    return DepartmentBrief(id=department.id, code=department.code, name=department.name("uz"))


def _ai_list_brief(complaint: Complaint) -> AiListBrief | None:
    """R2: ro'yxat qatori uchun qisqa AI ma'lumoti — Navbatim'dagi xulosa
    qatori va Tasdiqlash navbatidagi taklif. Oxirgi tahlil (LLM-always'da
    LLM tahlili) olinadi."""
    if not complaint.ai_analyses:
        return None
    latest = complaint.ai_analyses[-1]
    return AiListBrief(
        summary=latest.summary,
        suggested_category=_category_brief(latest.suggested_category) if latest.suggested_category else None,
        confidence=latest.confidence,
        open_subtasks=[
            OpenSubtaskBrief(id=s.id, department_id=s.department_id, department_name=s.department.name("uz"))
            for s in complaint.subtasks
            if s.status == "open"
        ],
    )


def _complaint_to_detail(complaint: Complaint) -> ComplaintDetail:
    latest_ai = complaint.ai_analyses[-1] if complaint.ai_analyses else None
    ai_out = None
    if latest_ai is not None:
        ai_out = AiAnalysisOut(
            engine=latest_ai.engine,
            suggested_category=_category_brief(latest_ai.suggested_category) if latest_ai.suggested_category else None,
            confidence=latest_ai.confidence,
            priority=latest_ai.priority,
            sentiment=latest_ai.sentiment,
            summary=latest_ai.summary,
            suggested_reply=latest_ai.suggested_reply,
            tags=latest_ai.tags,
            created_at=latest_ai.created_at,
        )

    # `need_info` da xodim so'ragan savol — fuqaro ko'radigan matn bilan
    # bir xil bo'lishi uchun oxirgi `info_requested` eventidan olinadi.
    info_request_text = None
    for event in reversed(complaint.events):
        if event.event_type == "info_requested" and event.payload:
            info_request_text = event.payload.get("text")
            break

    return ComplaintDetail(
        id=complaint.id,
        ticket_number=complaint.ticket_number,
        status=complaint.status,
        priority=complaint.priority,
        source=complaint.source,
        language=complaint.language,
        description=complaint.description,
        category=_category_brief(complaint.category),
        citizen=CitizenBrief.model_validate(complaint.citizen),
        latitude=complaint.latitude,
        longitude=complaint.longitude,
        address=complaint.address,
        neighborhood_name=complaint.neighborhood.name if complaint.neighborhood else None,
        department=_department_brief(complaint.assigned_department) if complaint.assigned_department else None,
        assigned_user_id=complaint.assigned_user_id,
        assigned_user_name=complaint.assigned_user.fullname if complaint.assigned_user else None,
        deadline_at=complaint.deadline_at,
        needs_review=complaint.needs_review,
        rejected_reason=complaint.rejected_reason,
        files=[FileOut.model_validate(f) for f in complaint.files],
        events=[EventOut.model_validate(e) for e in complaint.events],
        replies=[ReplyOut.model_validate(r) for r in complaint.replies],
        ai=ai_out,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
        resolved_at=complaint.resolved_at,
        accepted_at=complaint.accepted_at,
        info_requested_at=complaint.info_requested_at,
        info_provided_at=complaint.info_provided_at,
        info_request_text=info_request_text,
        citizen_messages=[
            CitizenMessageOut(
                id=m.id,
                text=m.text,
                source=m.source,
                recorded_by=m.recorded_by,
                recorded_by_name=m.recorder.fullname if m.recorder else None,
                created_at=m.created_at,
            )
            for m in complaint.citizen_messages
        ],
        subtasks=[
            SubtaskOut(
                id=s.id,
                department_id=s.department_id,
                department_name=s.department.name("uz"),
                assigned_user_id=s.assigned_user_id,
                status=s.status,
                note=s.note,
                deadline_at=s.deadline_at,
                created_at=s.created_at,
                closed_at=s.closed_at,
                created_by_ai=s.created_by is None,
            )
            for s in complaint.subtasks
        ],
        satisfaction=complaint.satisfaction,
        reopened_count=complaint.reopened_count,
    )


def _build_complaints_query(
    db: Session,
    staff: User,
    *,
    status: str | None,
    category: str | None,
    department_id: uuid.UUID | None,
    assigned_user_id: uuid.UUID | None,
    source: str | None,
    priority: str | None,
    overdue: bool,
    needs_review: bool,
    q: str | None,
    date_from: date | None,
    date_to: date | None,
    unassigned: bool = False,
    sla_risk: bool = False,
    need_info_over_hours: int | None = None,
    mine: bool = False,
    stuck_ai: bool = False,
):
    """Shared by list_complaints and export_complaints_xlsx (B5.5) so the two
    never drift apart on what "the same filtered set" means.

    v1.4 navbat filtrlari `services/queues.py` dagi AYNAN bir xil
    shartlarni ishlatadi — bosh ekrandagi karta raqami va shu yerdan
    chiqadigan ro'yxat hech qachon farq qilmaydi ([10] §10.1).
    """
    query = db.query(Complaint).join(Citizen, Complaint.citizen_id == Citizen.id).join(
        Category, Complaint.category_id == Category.id
    )
    if staff.role in DEPARTMENT_SCOPED_ROLES:
        query = query.filter(Complaint.assigned_department_id == staff.department_id)
    if status:
        query = query.filter(Complaint.status == status)
    if category:
        query = query.filter(Category.code == category)
    if department_id:
        query = query.filter(Complaint.assigned_department_id == department_id)
    if assigned_user_id:
        query = query.filter(Complaint.assigned_user_id == assigned_user_id)
    if mine:
        query = query.filter(Complaint.assigned_user_id == staff.id)
    if source:
        query = query.filter(Complaint.source == source)
    if priority:
        query = query.filter(Complaint.priority == priority)
    if overdue:
        query = query.filter(*queues.overdue())
    if needs_review:
        query = query.filter(*queues.ai_exceptions())
    if unassigned:
        query = query.filter(*queues.unassigned())
    if sla_risk:
        query = query.filter(*queues.sla_risk())
    if need_info_over_hours is not None:
        query = query.filter(*queues.awaiting_info(need_info_over_hours))
    if stuck_ai:
        query = query.filter(*queues.stuck_ai())
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(Complaint.ticket_number.ilike(like), Citizen.phone.ilike(like), Complaint.description.ilike(like))
        )
    if date_from:
        query = query.filter(Complaint.created_at >= date_from)
    if date_to:
        query = query.filter(Complaint.created_at < date_to + timedelta(days=1))
    return query


@router.get("/complaints", response_model=Page[ComplaintListItem])
def list_complaints(
    status: str | None = None,
    category: str | None = None,
    department_id: uuid.UUID | None = None,
    assigned_user_id: uuid.UUID | None = None,
    source: str | None = None,
    priority: str | None = None,
    overdue: bool = False,
    needs_review: bool = False,
    unassigned: bool = False,
    sla_risk: bool = False,
    need_info_over_hours: int | None = Query(None, ge=0),
    mine: bool = False,
    stuck_ai: bool = False,
    q: str | None = Query(None),
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_staff_up),
):
    query = _build_complaints_query(
        db,
        staff,
        status=status,
        category=category,
        department_id=department_id,
        assigned_user_id=assigned_user_id,
        source=source,
        priority=priority,
        overdue=overdue,
        needs_review=needs_review,
        q=q,
        date_from=date_from,
        date_to=date_to,
        unassigned=unassigned,
        sla_risk=sla_risk,
        need_info_over_hours=need_info_over_hours,
        mine=mine,
        stuck_ai=stuck_ai,
    )

    total = query.count()
    rows = (
        query.order_by(Complaint.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    )

    items = [
        ComplaintListItem(
            id=c.id,
            ticket_number=c.ticket_number,
            status=c.status,
            priority=c.priority,
            category=_category_brief(c.category),
            citizen=CitizenBrief.model_validate(c.citizen),
            neighborhood_name=c.neighborhood.name if c.neighborhood else None,
            department=_department_brief(c.assigned_department) if c.assigned_department else None,
            created_at=c.created_at,
            deadline_at=c.deadline_at,
            needs_review=c.needs_review,
            ai=_ai_list_brief(c),
            description_snippet=c.description[:160],
            assigned_user_id=c.assigned_user_id,
            assigned_user_name=c.assigned_user.fullname if c.assigned_user else None,
            info_requested_at=c.info_requested_at,
        )
        for c in rows
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/complaints/export.xlsx")
def export_complaints_xlsx(
    status: str | None = None,
    category: str | None = None,
    department_id: uuid.UUID | None = None,
    assigned_user_id: uuid.UUID | None = None,
    source: str | None = None,
    priority: str | None = None,
    overdue: bool = False,
    needs_review: bool = False,
    q: str | None = Query(None),
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_admin),
):
    """B5.5 — xuddi shu filtrlar (list_complaints bilan bir xil), lekin
    pagination'siz: filtrlangan hammasi bitta faylga. B6: eksport ham
    "workflowni nazorat qilish" toifasiga kiradi, faqat admin."""
    query = _build_complaints_query(
        db,
        staff,
        status=status,
        category=category,
        department_id=department_id,
        assigned_user_id=assigned_user_id,
        source=source,
        priority=priority,
        overdue=overdue,
        needs_review=needs_review,
        q=q,
        date_from=date_from,
        date_to=date_to,
    )
    rows = query.order_by(Complaint.created_at.desc()).all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Murojaatlar"
    headers = [
        "Ticket", "Holat", "Muhimlik", "Kategoriya", "Fuqaro", "Telefon", "Mahalla",
        "Bo'lim", "Xodim", "Manba", "Yaratildi", "Muddat", "Hal qilindi", "Ko'rib chiqish kerak",
    ]
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)

    for c in rows:
        ws.append([
            c.ticket_number,
            c.status,
            c.priority,
            c.category.name("uz") if c.category else "",
            c.citizen.fullname if c.citizen else "",
            c.citizen.phone if c.citizen else "",
            c.neighborhood.name if c.neighborhood else "",
            c.assigned_department.name("uz") if c.assigned_department else "",
            c.assigned_user.fullname if c.assigned_user else "",
            c.source,
            # B5.6: eksportdagi sanalar ham Toshkent vaqtida (UTC emas)
            format_local(c.created_at, "%Y-%m-%d %H:%M"),
            format_local(c.deadline_at, "%Y-%m-%d %H:%M"),
            format_local(c.resolved_at, "%Y-%m-%d %H:%M"),
            "ha" if c.needs_review else "",
        ])

    for column_cells in ws.columns:
        length = max(len(str(cell.value)) if cell.value is not None else 0 for cell in column_cells)
        ws.column_dimensions[column_cells[0].column_letter].width = min(max(length + 2, 10), 40)

    buf = io.BytesIO()
    wb.save(buf)
    filename = f"murojaatlar-{datetime.now(timezone.utc):%Y%m%d-%H%M}.xlsx"
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/complaints/{complaint_id}", response_model=ComplaintDetail)
def get_complaint(complaint_id: uuid.UUID, db: Session = Depends(get_db), staff: User = Depends(get_current_staff_up)):
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise AppError(404, "not_found", "Murojaat topilmadi")
    _check_department_access(complaint, staff)
    return _complaint_to_detail(complaint)


def _record_reply(db: Session, complaint: Complaint, text: str, staff: User) -> Reply:
    """Rasmiy javob yaratishning yagona yo'li (POST /replies va PATCH status
    resolved+reply_text ikkalasi shu yerdan o'tadi — yon effektlar drift
    qilmasin). R0: o'sha paytdagi AI drafti `ai_draft`ga snapshot qilinadi —
    draft-qabul KPI shu ustundan hisoblanadi."""
    latest_ai = complaint.ai_analyses[-1] if complaint.ai_analyses else None
    reply = Reply(
        complaint_id=complaint.id,
        ai_draft=latest_ai.suggested_reply if latest_ai else None,
        text=text,
        sent_by=staff.id,
        channels=["track"],
    )
    db.add(reply)
    db.flush()
    db.add(
        ComplaintEvent(
            complaint_id=complaint.id,
            event_type="reply_sent",
            actor_type="staff",
            actor_id=staff.id,
            payload={"reply_id": str(reply.id)},
        )
    )
    sms = sms_reply_text(complaint.citizen.language or "uz", complaint.ticket_number)
    notify_citizen(db, complaint.citizen, "Murojaatingizga rasmiy javob keldi", complaint_id=complaint.id, sms_text=sms)
    return reply


@router.patch("/complaints/{complaint_id}/status", response_model=ComplaintDetail)
def update_status(
    complaint_id: uuid.UUID,
    payload: StatusUpdateRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_staff_up),
):
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise AppError(404, "not_found", "Murojaat topilmadi")
    _check_department_access(complaint, staff)
    _check_status_permission(staff, payload.status)

    # R0/Q2 (docs/03 §5): resolved javobsiz o'tmaydi — fuqaro izohsiz
    # "Yakunlandi" ko'rmasin (premortem X4). reply_text faqat resolved bilan.
    if payload.reply_text and payload.status != STATUS_RESOLVED:
        raise AppError(422, "validation_error", "reply_text faqat status=resolved bilan qabul qilinadi")
    if payload.status == STATUS_RESOLVED:
        # S2: ochiq idoralararo topshiriq bilan yopish — boshqa bo'lim
        # hali ishlayotganda fuqaroga «hal qilindi» deyish demak.
        open_subtasks = [s for s in complaint.subtasks if s.status == "open"]
        if open_subtasks:
            raise AppError(
                422,
                "subtasks_open",
                f"{len(open_subtasks)} ta idoralararo topshiriq hali ochiq — avval ularni yoping",
            )
        if payload.reply_text:
            _record_reply(db, complaint, payload.reply_text, staff)
        elif not complaint.replies:
            raise AppError(
                422,
                "reply_required",
                "«Hal qilindi» uchun fuqaroga javob matni majburiy — reply_text yuboring "
                "(telefonda hal bo'lgan bo'lsa ham 1-2 jumlalik yakun yozing)",
            )

    workflow.change_status(db, complaint, payload.status, actor_type="staff", actor_id=staff.id, note=payload.note)
    db.commit()
    db.refresh(complaint)
    return _complaint_to_detail(complaint)


@router.post("/complaints/{complaint_id}/assign", response_model=ComplaintDetail)
def assign_complaint(
    complaint_id: uuid.UUID,
    payload: AssignRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_admin),
):
    """B6: bo'limga biriktirish/qayta yo'naltirish endi faqat admin ishi —
    AI ishonchli bo'lganda avtomatik biriktiradi (worker.py), admin esa
    ishonchsiz holatlarni yo'naltiradi yoki AI xato yo'naltirsa to'g'irlaydi."""
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise AppError(404, "not_found", "Murojaat topilmadi")
    if db.get(Department, payload.department_id) is None:
        raise AppError(404, "not_found", "Bo'lim topilmadi")

    if payload.assigned_user_id is not None:
        # v1.4: avval bu maydon umuman tekshirilmasdi — o'chirilgan yoki
        # butunlay boshqa bo'lim xodimini yozib qo'yish mumkin edi, va
        # murojaat hech kimning navbatida ko'rinmay qolardi ([03] §5).
        assignee = db.get(User, payload.assigned_user_id)
        if assignee is None or not assignee.is_active:
            raise AppError(422, "validation_error", "Xodim topilmadi yoki faol emas")
        if assignee.role != "admin" and assignee.department_id != payload.department_id:
            raise AppError(422, "validation_error", "Xodim bu bo'limga tegishli emas")
        workflow.assign(db, complaint, payload.department_id, payload.assigned_user_id, actor_id=staff.id)
    else:
        # Xodim ko'rsatilmagan: bo'lim o'zgarmasa mavjud egasi saqlanadi.
        workflow.assign(db, complaint, payload.department_id, actor_id=staff.id)

    db.commit()
    db.refresh(complaint)
    return _complaint_to_detail(complaint)


@router.post("/complaints/{complaint_id}/claim", response_model=ComplaintDetail)
def claim_complaint(
    complaint_id: uuid.UUID,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_staff_up),
):
    """«Qabul qilaman» (v1.4, [03] §2.1) — egalik va `accepted_at` shu yerda.

    Avval `accepted` ni FE tafsilot sahifasi ochilganda o'zi qo'yardi:
    «ko'rdim» «qabul qildim» bilan tenglashardi, mas'ul xodim
    aniqlanmasdi, va API'ni to'g'ridan-to'g'ri ishlatgan klient bu
    bosqichni butunlay o'tkazib yuborardi.
    """
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise AppError(404, "not_found", "Murojaat topilmadi")

    workflow.claim(db, complaint, staff)
    db.commit()
    db.refresh(complaint)
    return _complaint_to_detail(complaint)


@router.post("/complaints/{complaint_id}/citizen-info", response_model=ComplaintDetail, status_code=201)
def record_manual_citizen_info(
    complaint_id: uuid.UUID,
    payload: CitizenInfoIn,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_staff_up),
):
    """Manual kanal ([03] §5): xodim fuqaro bilan telefonda/jonli
    gaplashib olgan ma'lumotni yozib qo'yadi.

    Statusni ATAYLAB o'zgartirmaydi — fuqaro rostdan javob berganini
    faqat xodim biladi, shuning uchun `in_progress` ga qaytarish ham
    uning ongli qarori bo'lib qoladi (web/Telegram'da esa avtomatik).
    """
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise AppError(404, "not_found", "Murojaat topilmadi")
    _check_department_access(complaint, staff)

    citizen_info.record_citizen_info(db, complaint, payload.text, source="manual", recorded_by=staff.id)
    db.commit()
    db.refresh(complaint)
    return _complaint_to_detail(complaint)


@router.post("/complaints/{complaint_id}/subtasks", response_model=ComplaintDetail, status_code=201)
def create_subtask(
    complaint_id: uuid.UUID,
    payload: SubtaskIn,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_admin),
):
    """Idoralararo topshiriq ([03] §5, S2).

    Bitta murojaat bir necha bo'limga tegishli bo'lishi mumkin (yo'l
    buzilishi + drenaj + chiqindi). Har bo'lim o'z qismini bajaradi,
    fuqaroga esa javob BITTA bo'ladi.
    """
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise AppError(404, "not_found", "Murojaat topilmadi")
    department = db.get(Department, payload.department_id)
    if department is None:
        raise AppError(404, "not_found", "Bo'lim topilmadi")
    if payload.assigned_user_id is not None:
        assignee = db.get(User, payload.assigned_user_id)
        if assignee is None or not assignee.is_active or assignee.department_id != payload.department_id:
            raise AppError(422, "validation_error", "Xodim topilmadi yoki bu bo'limga tegishli emas")

    subtask = ComplaintSubtask(
        complaint_id=complaint.id,
        department_id=payload.department_id,
        assigned_user_id=payload.assigned_user_id,
        note=payload.note,
        deadline_at=payload.deadline_at,
        created_by=staff.id,
    )
    db.add(subtask)
    db.flush()

    db.add(
        ComplaintEvent(
            complaint_id=complaint.id,
            event_type="subtask_created",
            actor_type="staff",
            actor_id=staff.id,
            payload={"subtask_id": str(subtask.id), "department_id": str(payload.department_id)},
        )
    )
    for user in db.execute(
        select(User).where(
            User.is_active.is_(True),
            User.role == "department_staff",
            User.department_id == payload.department_id,
        )
    ).scalars():
        notify_staff(db, user, f"Yangi idoralararo topshiriq: {complaint.ticket_number}", complaint_id=complaint.id)

    db.commit()
    db.refresh(complaint)
    return _complaint_to_detail(complaint)


@router.patch("/subtasks/{subtask_id}", response_model=ComplaintDetail)
def update_subtask(
    subtask_id: uuid.UUID,
    payload: SubtaskUpdate,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_staff_up),
):
    subtask = db.get(ComplaintSubtask, subtask_id)
    if subtask is None:
        raise AppError(404, "not_found", "Topshiriq topilmadi")
    if staff.role in DEPARTMENT_SCOPED_ROLES and subtask.department_id != staff.department_id:
        raise AppError(403, "forbidden", "Bu topshiriq sizning bo'limingizga tegishli emas")

    subtask.status = payload.status
    if payload.note:
        subtask.note = payload.note
    subtask.closed_at = datetime.now(timezone.utc) if payload.status != "open" else None

    db.add(
        ComplaintEvent(
            complaint_id=subtask.complaint_id,
            event_type="subtask_closed" if payload.status != "open" else "subtask_created",
            actor_type="staff",
            actor_id=staff.id,
            payload={"subtask_id": str(subtask.id), "status": payload.status},
        )
    )
    db.commit()
    complaint = db.get(Complaint, subtask.complaint_id)
    db.refresh(complaint)
    return _complaint_to_detail(complaint)


@router.post("/complaints/{complaint_id}/review", response_model=ComplaintDetail)
def review_complaint(
    complaint_id: uuid.UUID,
    payload: ReviewRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_admin),
):
    """R0/Q3 (docs/03 §5): needs_review navbatini BIR bosishda yopish.
    Bo'sh body = AI taklifini qabul qilish; body bilan = to'g'irlab qabul.
    `assign` o'z o'rnida qoladi — bu uning «AI taklifiga rozilik» o'rami."""
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise AppError(404, "not_found", "Murojaat topilmadi")

    if payload.category_code:
        category = db.execute(
            select(Category).where(Category.code == payload.category_code)
        ).scalar_one_or_none()
        if category is None:
            raise AppError(404, "not_found", "Kategoriya topilmadi")
    else:
        latest_ai = complaint.ai_analyses[-1] if complaint.ai_analyses else None
        category = (
            latest_ai.suggested_category
            if latest_ai is not None and latest_ai.suggested_category is not None
            else complaint.category
        )

    complaint.category_id = category.id
    complaint.deadline_at = compute_deadline(complaint.created_at, category.sla_hours, complaint.priority)

    department_id = payload.department_id or category.department_id
    if department_id is None:
        raise AppError(422, "validation_error", "Kategoriya bo'limga bog'lanmagan — department_id ham yuboring")
    if db.get(Department, department_id) is None:
        raise AppError(404, "not_found", "Bo'lim topilmadi")

    # Hali yo'naltirilmagan yoki boshqa bo'limda bo'lsa — biriktiramiz (state
    # machine tekshiruvi workflow.assign ichida). Aynan shu bo'limda bo'lsa
    # qayta assign shart emas.
    if complaint.assigned_department_id != department_id or complaint.status in (STATUS_NEW, STATUS_AI_PROCESSED):
        # `assigned_user_id` berilmaydi: bo'lim o'zgarmasa mavjud egasi
        # saqlanadi ([03] §5 «Egalik qoidasi»).
        workflow.assign(db, complaint, department_id, actor_id=staff.id)

    complaint.needs_review = False
    db.add(
        ComplaintEvent(
            complaint_id=complaint.id,
            event_type="reviewed",
            actor_type="staff",
            actor_id=staff.id,
            payload={
                "category_code": category.code,
                "department_id": str(department_id),
                # v1.4: sabab majburiy — usiz AI sifatini o'lchab
                # bo'lmasdi, faqat «admin nimanidir o'zgartirdi» qolardi.
                "reason": payload.reason,
                "reason_text": payload.reason_text,
            },
        )
    )
    db.commit()
    db.refresh(complaint)
    return _complaint_to_detail(complaint)


@router.post("/complaints/{complaint_id}/replies", response_model=ComplaintDetail, status_code=201)
def create_reply(
    complaint_id: uuid.UUID,
    payload: ReplyIn,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_staff_up),
):
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise AppError(404, "not_found", "Murojaat topilmadi")
    _check_department_access(complaint, staff)

    _record_reply(db, complaint, payload.text, staff)
    db.commit()
    db.refresh(complaint)
    return _complaint_to_detail(complaint)


@router.post("/complaints/{complaint_id}/comments", response_model=ComplaintDetail, status_code=201)
def create_comment(
    complaint_id: uuid.UUID,
    payload: CommentIn,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_staff_up),
):
    """Internal note — not visible to the citizen (unlike replies)."""
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise AppError(404, "not_found", "Murojaat topilmadi")
    _check_department_access(complaint, staff)

    db.add(
        ComplaintEvent(
            complaint_id=complaint.id,
            event_type="comment_added",
            actor_type="staff",
            actor_id=staff.id,
            payload={"text": payload.text},
        )
    )
    db.commit()
    db.refresh(complaint)
    return _complaint_to_detail(complaint)


@router.get("/departments", response_model=list[DepartmentOut], dependencies=[Depends(get_current_staff_up)])
def list_departments(db: Session = Depends(get_db)):
    return db.execute(select(Department).order_by(Department.code)).scalars().all()


@router.post("/departments", response_model=DepartmentOut, status_code=201, dependencies=[Depends(get_current_admin)])
def create_department(payload: DepartmentIn, db: Session = Depends(get_db)):
    if db.execute(select(Department).where(Department.code == payload.code)).scalar_one_or_none():
        raise AppError(400, "already_exists", "Bu kod band")
    department = Department(**payload.model_dump())
    db.add(department)
    db.commit()
    db.refresh(department)
    return department


@router.patch("/departments/{department_id}", response_model=DepartmentOut, dependencies=[Depends(get_current_admin)])
def update_department(department_id: uuid.UUID, payload: DepartmentPatch, db: Session = Depends(get_db)):
    department = db.get(Department, department_id)
    if department is None:
        raise AppError(404, "not_found", "Bo'lim topilmadi")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(department, field, value)
    db.commit()
    db.refresh(department)
    return department


@router.get("/categories", response_model=list[CategoryAdminOut], dependencies=[Depends(get_current_staff_up)])
def list_categories(db: Session = Depends(get_db)):
    return db.execute(select(Category).order_by(Category.sort_order)).scalars().all()


@router.post("/categories", response_model=CategoryAdminOut, status_code=201, dependencies=[Depends(get_current_admin)])
def create_category(payload: CategoryIn, db: Session = Depends(get_db)):
    if db.execute(select(Category).where(Category.code == payload.code)).scalar_one_or_none():
        raise AppError(400, "already_exists", "Bu kategoriya kodi band")
    if payload.department_id and db.get(Department, payload.department_id) is None:
        raise AppError(404, "not_found", "Bo'lim topilmadi")
    category = Category(**payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/categories/{category_id}", response_model=CategoryAdminOut, dependencies=[Depends(get_current_admin)])
def update_category(category_id: uuid.UUID, payload: CategoryPatch, db: Session = Depends(get_db)):
    category = db.get(Category, category_id)
    if category is None:
        raise AppError(404, "not_found", "Kategoriya topilmadi")
    if payload.department_id and db.get(Department, payload.department_id) is None:
        raise AppError(404, "not_found", "Bo'lim topilmadi")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


@router.get("/stats/dashboard", response_model=DashboardStats, dependencies=[Depends(get_current_admin)])
def dashboard_stats(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    # B5.6: "bugun/hafta/oy" Toshkent kalendari bo'yicha — aks holda soat
    # 00:00–05:00 da kelgan murojaatlar "kechagi" bo'lib ko'rinardi.
    today_start, week_start, month_start = day_bounds_utc(now)
    seven_days_ago = now - timedelta(days=7)

    priority_rows = db.query(Complaint.priority, func.count()).group_by(Complaint.priority).all()

    ai_scored = (
        db.query(Complaint)
        .filter(Complaint.created_at >= seven_days_ago, Complaint.ai_category_id.isnot(None))
        .all()
    )
    ai_accuracy_7d = (
        round(sum(1 for c in ai_scored if c.ai_category_id == c.category_id) / len(ai_scored), 2)
        if ai_scored
        else None
    )

    neighborhood_rows = (
        db.query(Neighborhood.id, Neighborhood.name, func.count(Complaint.id))
        .join(Complaint, Complaint.neighborhood_id == Neighborhood.id)
        .group_by(Neighborhood.id, Neighborhood.name)
        .order_by(func.count(Complaint.id).desc())
        .all()
    )

    # B6: AI avto-yo'naltirish monitoring — so'nggi 7 kunda AI qancha murojaatni
    # o'zi bo'limga yubordi, va shulardan qanchasini admin keyin qo'lda
    # boshqa bo'limga qayta yo'naltirdi (AI xato yo'naltirgan degani).
    ai_assigned_events = (
        db.query(ComplaintEvent.complaint_id, ComplaintEvent.created_at)
        .filter(
            ComplaintEvent.event_type == "assigned",
            ComplaintEvent.actor_type == "ai",
            ComplaintEvent.created_at >= seven_days_ago,
        )
        .all()
    )
    ai_routing_corrected_7d = 0
    if ai_assigned_events:
        complaint_ids = [cid for cid, _ in ai_assigned_events]
        staff_by_complaint: dict[uuid.UUID, list[datetime]] = defaultdict(list)
        for cid, created_at in (
            db.query(ComplaintEvent.complaint_id, ComplaintEvent.created_at)
            .filter(
                ComplaintEvent.event_type == "assigned",
                ComplaintEvent.actor_type == "staff",
                ComplaintEvent.complaint_id.in_(complaint_ids),
            )
            .all()
        ):
            staff_by_complaint[cid].append(created_at)
        ai_routing_corrected_7d = sum(
            1
            for cid, ai_created_at in ai_assigned_events
            if any(t > ai_created_at for t in staff_by_complaint.get(cid, []))
        )

    # ---- R0 avtomatlashtirish KPI (docs/03 §5, docs/00 §Muvaffaqiyat #5) ----
    total_7d = db.query(Complaint).filter(Complaint.created_at >= seven_days_ago).count()

    # zero_touch_7d: AI biriktirgan va admin keyin qayta yo'naltirMAgan ulush.
    zero_touch_7d = (
        round((len(ai_assigned_events) - ai_routing_corrected_7d) / total_7d, 2) if total_7d else None
    )

    # draft_reply_share_7d: ai_draft snapshotli javoblar ichida yuborilgan matn
    # draft bilan >=50% o'xshash bo'lganlari (difflib ratio — kichik hajmda arzon).
    replies_7d = (
        db.query(Reply)
        .filter(Reply.sent_at >= seven_days_ago, Reply.ai_draft.isnot(None))
        .all()
    )
    draft_reply_share_7d = (
        round(
            sum(1 for r in replies_7d if SequenceMatcher(None, r.text, r.ai_draft).ratio() >= 0.5)
            / len(replies_7d),
            2,
        )
        if replies_7d
        else None
    )

    # avg_first_action_hours_7d: birinchi biriktirilishdan xodimning birinchi
    # harakatigacha (status/reply/comment, actor=staff) o'rtacha soat.
    recent_events = (
        db.query(ComplaintEvent)
        .join(Complaint, ComplaintEvent.complaint_id == Complaint.id)
        .filter(Complaint.created_at >= seven_days_ago)
        .order_by(ComplaintEvent.created_at)
        .all()
    )
    first_assigned: dict[uuid.UUID, datetime] = {}
    first_action: dict[uuid.UUID, datetime] = {}
    for e in recent_events:
        if e.event_type == "assigned" and e.complaint_id not in first_assigned:
            first_assigned[e.complaint_id] = e.created_at
        elif (
            e.event_type in ("status_changed", "reply_sent", "comment_added")
            and e.actor_type == "staff"
            and e.complaint_id in first_assigned
            and e.complaint_id not in first_action
        ):
            first_action[e.complaint_id] = e.created_at
    reaction_hours = [
        (first_action[cid] - first_assigned[cid]).total_seconds() / 3600 for cid in first_action
    ]
    avg_first_action_hours_7d = round(sum(reaction_hours) / len(reaction_hours), 1) if reaction_hours else None

    # resolved_with_reply_7d: 7 kunda hal qilinganlardan javob matni ham
    # yuborilganlari ulushi (reply_required'dan keyin 1.0 bo'lishi kutiladi).
    resolved_7d = (
        db.query(Complaint)
        .filter(Complaint.resolved_at.isnot(None), Complaint.resolved_at >= seven_days_ago)
        .all()
    )
    resolved_with_reply_7d = (
        round(sum(1 for c in resolved_7d if c.replies) / len(resolved_7d), 2) if resolved_7d else None
    )

    return DashboardStats(
        today=db.query(Complaint).filter(Complaint.created_at >= today_start).count(),
        this_week=db.query(Complaint).filter(Complaint.created_at >= week_start).count(),
        this_month=db.query(Complaint).filter(Complaint.created_at >= month_start).count(),
        resolved=db.query(Complaint).filter(Complaint.status == STATUS_RESOLVED).count(),
        in_progress=db.query(Complaint).filter(Complaint.status.in_([STATUS_IN_PROGRESS, STATUS_ASSIGNED])).count(),
        overdue=db.query(Complaint)
        .filter(Complaint.deadline_at < now, Complaint.status.notin_(TERMINAL_STATUSES))
        .count(),
        needs_review=db.query(Complaint).filter(Complaint.needs_review.is_(True)).count(),
        by_priority={priority: count for priority, count in priority_rows},
        ai_accuracy_7d=ai_accuracy_7d,
        by_neighborhood=[
            NeighborhoodStat(neighborhood_id=nid, neighborhood_name=name, count=count)
            for nid, name, count in neighborhood_rows
        ],
        ai_auto_routed_7d=len(ai_assigned_events),
        ai_routing_corrected_7d=ai_routing_corrected_7d,
        zero_touch_7d=zero_touch_7d,
        draft_reply_share_7d=draft_reply_share_7d,
        avg_first_action_hours_7d=avg_first_action_hours_7d,
        resolved_with_reply_7d=resolved_with_reply_7d,
    )


@router.get("/stats/ai-health", response_model=AiHealthOut, dependencies=[Depends(get_current_admin)])
def stats_ai_health(db: Session = Depends(get_db)):
    """R0/Q4 (docs/03 §5): LLM jim o'lishi endi ko'rinadigan hodisa.
    Manba: worker yozadigan Redis markerlari + DB fallback + jonli ping."""
    now = datetime.now(timezone.utc)

    last_success: datetime | None = None
    try:
        raw = redis_client.get("ai:llm_last_success")
        if raw:
            last_success = datetime.fromisoformat(raw)
    except Exception:
        pass
    if last_success is None:
        # Redis bo'sh (restart) — oxirgi muvaffaqiyatli llm yozuvi DB'dan.
        row = (
            db.execute(
                select(AiAnalysis.created_at)
                .where(AiAnalysis.engine == "llm")
                .order_by(AiAnalysis.created_at.desc())
                .limit(1)
            )
            .scalars()
            .first()
        )
        last_success = row

    ollama_ok = last_success is not None and (now - last_success) <= timedelta(minutes=10)
    if not ollama_ok:
        # Yaqin muvaffaqiyat yo'q — jonli ping (2 s): server/API turibdimi o'zi?
        # LLM_PROVIDER=deepseek bo'lsa Ollama'ni emas, DeepSeek'ni tekshiramiz
        # (aks holda lokal Ollama o'chiq bo'lsa ham deepseek ishlab turgan
        # bo'lishi mumkin — dashboard yolg'on "ishlamayapti" ko'rsatardi).
        try:
            if settings.llm_provider == "deepseek":
                ping = httpx.get(
                    f"{settings.deepseek_base_url}/models",
                    headers={"Authorization": f"Bearer {settings.deepseek_api_key or ''}"},
                    timeout=2.0,
                )
            else:
                ping = httpx.get(f"{settings.ollama_url}/api/tags", timeout=2.0)
            ollama_ok = ping.status_code == 200
        except httpx.HTTPError:
            ollama_ok = False

    llm_queue_depth = 0
    try:
        # ARQ navbati sorted-set (arq:queue). Barcha turdagi kutayotgan ishlar —
        # "AI navbati chuqurligi" sifatida yetarli yaqinlashuv.
        llm_queue_depth = int(redis_client.zcard("arq:queue") or 0)
    except Exception:
        pass

    llm_errors_1h = 0
    try:
        for bucket in (now, now - timedelta(hours=1)):
            raw = redis_client.get(f"ai:llm_err:{bucket:%Y%m%d%H}")
            llm_errors_1h += int(raw) if raw else 0
    except Exception:
        pass

    from app.models.stt_job import SttJob  # lokal import — modul yuqorisida kerak emas

    last_stt = (
        db.execute(select(SttJob).order_by(SttJob.created_at.desc()).limit(1)).scalars().first()
    )
    stt_ok = last_stt is None or last_stt.status != "failed"

    _, active_model = current_engine_and_model()
    return AiHealthOut(
        ollama_ok=ollama_ok,
        model=active_model,
        last_llm_success_at=last_success,
        llm_queue_depth=llm_queue_depth,
        llm_errors_1h=llm_errors_1h,
        pending_analysis=db.query(Complaint).filter(Complaint.status == STATUS_NEW).count(),
        stt_ok=stt_ok,
    )


@router.get("/stats/queues", response_model=QueueStats, dependencies=[Depends(get_current_admin)])
def stats_queues(db: Session = Depends(get_db)):
    """Operatsion bosh ekran ([03] §5, [10] §10.1) — «hozir qaysi ishni
    olish kerak?» degan savolga javob.

    Har son `services/queues.py` dagi AYNAN shu shartlardan chiqadi,
    `GET /complaints?...` filtrlari ham o'sha yerdan — karta raqami va
    bosilganda ochiladigan ro'yxat hech qachon farq qilmaydi.
    """
    now = datetime.now(timezone.utc)

    def count(conditions) -> int:
        return db.query(Complaint).filter(*conditions).count()

    active = Complaint.status.notin_(TERMINAL_STATUSES)
    rows: list[DepartmentQueueRow] = []
    departments = (
        db.execute(select(Department).where(Department.is_active.is_(True)).order_by(Department.code))
        .scalars()
        .all()
    )
    for department in departments:
        scoped = Complaint.assigned_department_id == department.id
        new_count = db.query(Complaint).filter(
            scoped, Complaint.status.in_([STATUS_ASSIGNED, STATUS_AI_PROCESSED])
        ).count()
        in_progress_count = db.query(Complaint).filter(scoped, Complaint.status == STATUS_IN_PROGRESS).count()
        active_load = db.query(Complaint).filter(scoped, active).count()
        rows.append(
            DepartmentQueueRow(
                department_id=department.id,
                department_name=department.name("uz"),
                new=new_count,
                in_progress=in_progress_count,
                sla_risk=db.query(Complaint).filter(scoped, *queues.sla_risk(now)).count(),
                overdue=db.query(Complaint).filter(scoped, *queues.overdue(now)).count(),
                unowned=db.query(Complaint).filter(scoped, active, Complaint.assigned_user_id.is_(None)).count(),
                wip_limit=department.wip_limit,
                # Limit BLOKLAMAYDI — faqat rahbarga «bu bo'lim qoqilib
                # qoldi» degan signal ([04] departments.wip_limit).
                over_limit=department.wip_limit is not None and active_load > department.wip_limit,
            )
        )

    return QueueStats(
        unassigned=count(queues.unassigned()),
        ai_exceptions=count(queues.ai_exceptions()),
        sla_risk=count(queues.sla_risk(now)),
        overdue=count(queues.overdue(now)),
        awaiting_info=count(queues.awaiting_info(now=now)),
        stuck_ai=count(queues.stuck_ai(now)),
        by_department=rows,
    )


@router.get("/stats/heatmap", response_model=list[HeatmapPoint], dependencies=[Depends(get_current_admin)])
def stats_heatmap(date_from: date | None = None, date_to: date | None = None, db: Session = Depends(get_db)):
    """docs/03-kontraktlar.md §5: [{lat, lng, weight}]. Yaqin koordinatalar
    (~11m, 4 xona) bitta nuqtaga birlashtirilib, weight = shu joydagi
    murojaatlar soni — xom nuqtalar to'plami emas, haqiqiy zichlik signali."""
    query = db.query(Complaint.latitude, Complaint.longitude).filter(
        Complaint.latitude.isnot(None), Complaint.longitude.isnot(None)
    )
    if date_from:
        query = query.filter(Complaint.created_at >= date_from)
    if date_to:
        query = query.filter(Complaint.created_at < date_to + timedelta(days=1))

    buckets: dict[tuple[float, float], int] = defaultdict(int)
    for lat, lng in query.all():
        buckets[(round(lat, 4), round(lng, 4))] += 1

    return [HeatmapPoint(lat=lat, lng=lng, weight=weight) for (lat, lng), weight in buckets.items()]


_MAP_POINTS_LIMIT = 2000


@router.get("/stats/map-points", response_model=list[MapPoint], dependencies=[Depends(get_current_admin)])
def stats_map_points(
    category: str | None = None,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
):
    """F4.1 — heatmap nuqtalari (yuqorida) koordinataga qarab birlashtirilgani
    uchun alohida murojaatni bilmaydi (popup uchun ticket/status kerak
    bo'lgan marker-cluster rejimi uchun yaramaydi) — shu sabab bu alohida,
    filtrlangan bo'lsa-da yaxlitlanmagan nuqtalar ro'yxati bor. Eng so'nggi
    2000 tasi bilan cheklangan (xarita, cheksiz marker bilan foydali emas)."""
    query = (
        db.query(Complaint)
        .join(Category, Complaint.category_id == Category.id)
        .options(joinedload(Complaint.category))
        .filter(Complaint.latitude.isnot(None), Complaint.longitude.isnot(None))
    )
    if category:
        query = query.filter(Category.code == category)
    if status:
        query = query.filter(Complaint.status == status)
    if date_from:
        query = query.filter(Complaint.created_at >= date_from)
    if date_to:
        query = query.filter(Complaint.created_at < date_to + timedelta(days=1))

    rows = query.order_by(Complaint.created_at.desc()).limit(_MAP_POINTS_LIMIT).all()
    return [
        MapPoint(
            id=c.id,
            ticket_number=c.ticket_number,
            lat=c.latitude,
            lng=c.longitude,
            status=c.status,
            priority=c.priority,
            category_name=c.category.name("uz"),
        )
        for c in rows
    ]


_KPI_GROUP_ATTRS = {
    "department": "assigned_department_id",
    "user": "assigned_user_id",
    "neighborhood": "neighborhood_id",
    "category": "category_id",
}


def _kpi_label(group_by: str, complaint: Complaint) -> str:
    if group_by == "department":
        return complaint.assigned_department.name("uz") if complaint.assigned_department else "Biriktirilmagan"
    if group_by == "user":
        return complaint.assigned_user.fullname if complaint.assigned_user else "Biriktirilmagan"
    if group_by == "neighborhood":
        return complaint.neighborhood.name if complaint.neighborhood else "Noma'lum"
    return complaint.category.name("uz") if complaint.category else "Noma'lum"


@router.get("/stats/kpi", response_model=list[KpiRow], dependencies=[Depends(get_current_admin)])
def stats_kpi(
    group_by: str = Query(...),
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
):
    if group_by not in _KPI_GROUP_ATTRS:
        raise AppError(422, "validation_error", "Noto'g'ri group_by qiymati")

    query = db.query(Complaint).options(
        joinedload(Complaint.assigned_department),
        joinedload(Complaint.assigned_user),
        joinedload(Complaint.neighborhood),
        joinedload(Complaint.category),
    )
    if date_from:
        query = query.filter(Complaint.created_at >= date_from)
    if date_to:
        query = query.filter(Complaint.created_at < date_to + timedelta(days=1))
    complaints = query.all()

    first_reply_at: dict[uuid.UUID, datetime] = {}
    if complaints:
        reply_rows = (
            db.query(Reply.complaint_id, func.min(Reply.sent_at))
            .filter(Reply.complaint_id.in_([c.id for c in complaints]))
            .group_by(Reply.complaint_id)
            .all()
        )
        first_reply_at = dict(reply_rows)

    attr = _KPI_GROUP_ATTRS[group_by]
    groups: dict[str | None, list[Complaint]] = defaultdict(list)
    for c in complaints:
        value = getattr(c, attr)
        groups[str(value) if value else None].append(c)

    rows = []
    for key, items in groups.items():
        resolved_items = [c for c in items if c.status in (STATUS_RESOLVED, "closed")]

        response_hours = [
            (first_reply_at[c.id] - c.created_at).total_seconds() / 3600 for c in items if c.id in first_reply_at
        ]
        resolution_hours = [
            (c.resolved_at - c.created_at).total_seconds() / 3600 for c in resolved_items if c.resolved_at
        ]
        sla_eligible = [c for c in resolved_items if c.resolved_at and c.deadline_at]

        rows.append(
            KpiRow(
                key=key,
                label=_kpi_label(group_by, items[0]),
                total=len(items),
                resolved=len(resolved_items),
                avg_first_response_hours=round(sum(response_hours) / len(response_hours), 1)
                if response_hours
                else None,
                avg_resolution_hours=round(sum(resolution_hours) / len(resolution_hours), 1)
                if resolution_hours
                else None,
                sla_percent=round(100 * sum(1 for c in sla_eligible if c.resolved_at <= c.deadline_at) / len(sla_eligible), 1)
                if sla_eligible
                else None,
            )
        )

    rows.sort(key=lambda r: r.total, reverse=True)
    return rows


@router.get("/users", response_model=list[UserAdminOut], dependencies=[Depends(get_current_admin)])
def list_users(db: Session = Depends(get_db)):
    return db.execute(select(User).order_by(User.first_name)).scalars().all()


@router.post("/users", response_model=UserAdminOut, status_code=201, dependencies=[Depends(get_current_admin)])
def create_user(payload: UserIn, db: Session = Depends(get_db)):
    if db.execute(select(User).where(User.phone == payload.phone)).scalar_one_or_none():
        raise AppError(400, "already_exists", "Bu telefon raqami band")
    if payload.department_id and db.get(Department, payload.department_id) is None:
        raise AppError(404, "not_found", "Bo'lim topilmadi")

    data = payload.model_dump(exclude={"password"})
    user = User(**data, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserAdminOut, dependencies=[Depends(get_current_admin)])
def update_user(user_id: uuid.UUID, payload: UserPatch, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise AppError(404, "not_found", "Xodim topilmadi")
    if payload.department_id and db.get(Department, payload.department_id) is None:
        raise AppError(404, "not_found", "Bo'lim topilmadi")

    updates = payload.model_dump(exclude_unset=True, exclude={"password"})
    for field, value in updates.items():
        setattr(user, field, value)
    if payload.password:
        user.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(user)
    return user


@router.get("/audit-logs", response_model=Page[AuditLogOut], dependencies=[Depends(get_current_admin)])
def list_audit_logs(
    user_id: uuid.UUID | None = None,
    entity: str | None = None,
    action: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if entity:
        query = query.filter(AuditLog.entity == entity)
    if action:
        query = query.filter(AuditLog.action == action)
    if date_from:
        query = query.filter(AuditLog.created_at >= date_from)
    if date_to:
        query = query.filter(AuditLog.created_at < date_to + timedelta(days=1))

    total = query.count()
    rows = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = [
        AuditLogOut(
            id=row.id,
            user_id=row.user_id,
            user_fullname=row.user.fullname if row.user else None,
            action=row.action,
            entity=row.entity,
            entity_id=row.entity_id,
            meta=row.meta,
            ip=row.ip,
            created_at=row.created_at,
        )
        for row in rows
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)


def _qr_urls(code: str) -> tuple[str, str]:
    """PNG/PDF joylanadigan kalit `code`dan hosil qilinadi (deterministik) —
    shu sabab URL'ni saqlash uchun alohida DB ustuni kerak emas."""
    base = f"{settings.s3_public_base_url}/qr-posters/{code}"
    return f"{base}.png", f"{base}.pdf"


def _qr_to_out(qr: QrCode) -> QrCodeOut:
    png_url, pdf_url = _qr_urls(qr.code)
    return QrCodeOut(
        id=qr.id,
        code=qr.code,
        neighborhood_id=qr.neighborhood_id,
        neighborhood_name=qr.neighborhood.name if qr.neighborhood_id else None,
        note=qr.note,
        scans=qr.scans,
        created_at=qr.created_at,
        png_url=png_url,
        pdf_url=pdf_url,
    )


@router.get("/qr-codes", response_model=list[QrCodeOut], dependencies=[Depends(get_current_admin)])
def list_qr_codes(db: Session = Depends(get_db)):
    rows = db.execute(select(QrCode).order_by(QrCode.created_at.desc())).scalars().all()
    return [_qr_to_out(qr) for qr in rows]


@router.post("/qr-codes", response_model=QrCodeOut, status_code=201, dependencies=[Depends(get_current_admin)])
def create_qr_code(payload: QrCodeIn, db: Session = Depends(get_db)):
    if payload.neighborhood_id and db.get(Neighborhood, payload.neighborhood_id) is None:
        raise AppError(404, "not_found", "Mahalla topilmadi")

    for _ in range(5):
        code = secrets.token_hex(4)
        if not db.execute(select(QrCode).where(QrCode.code == code)).scalar_one_or_none():
            break
    else:
        raise AppError(500, "server_error", "QR kod generatsiya qilib bo'lmadi, qayta urining")

    qr = QrCode(code=code, neighborhood_id=payload.neighborhood_id, note=payload.note)
    db.add(qr)
    db.flush()

    neighborhood_name = qr.neighborhood.name if qr.neighborhood_id else None
    landing_url = f"{settings.public_base_url}/go?m={code}"
    png_bytes = generate_qr_png(landing_url)
    pdf_bytes = generate_poster_pdf(landing_url, neighborhood_name)
    upload_object(png_bytes, "image/png", f"qr-posters/{code}.png")
    upload_object(pdf_bytes, "application/pdf", f"qr-posters/{code}.pdf")

    db.commit()
    db.refresh(qr)
    return _qr_to_out(qr)


@router.get("/stats/ai-trend", response_model=list[AiTrendPoint], dependencies=[Depends(get_current_admin)])
def stats_ai_trend(days: int = Query(30, ge=1, le=180), db: Session = Depends(get_db)):
    """Kunlik AI sifat trendi (v1.3 — LLM yagona dvigatel, shu sabab eski
    "LLM ulushi" ko'rsatkichi ma'nosini yo'qotdi va olib tashlandi):
    `accuracy` = AI tanlagan kategoriya yakuniy kategoriyaga teng bo'lgan
    ulush (ya'ni admin qo'lda to'g'irlamagan), `low_confidence_share` = AI
    o'zi ikkilangan (needs_review) murojaatlar ulushi — docs/07 §5."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    accuracy_by_day: dict[str, list[bool]] = defaultdict(list)
    low_conf_by_day: dict[str, list[bool]] = defaultdict(list)
    for created_at, ai_cat, cat, needs_review in (
        db.query(Complaint.created_at, Complaint.ai_category_id, Complaint.category_id, Complaint.needs_review)
        .filter(Complaint.created_at >= since, Complaint.ai_category_id.isnot(None))
        .all()
    ):
        day = created_at.date().isoformat()
        accuracy_by_day[day].append(ai_cat == cat)
        low_conf_by_day[day].append(bool(needs_review))

    points = []
    for i in range(days + 1):
        day = (since + timedelta(days=i)).date().isoformat()
        acc_list = accuracy_by_day.get(day)
        low_list = low_conf_by_day.get(day)
        points.append(
            AiTrendPoint(
                date=day,
                accuracy=round(sum(acc_list) / len(acc_list), 2) if acc_list else None,
                low_confidence_share=round(sum(low_list) / len(low_list), 2) if low_list else None,
            )
        )
    return points
