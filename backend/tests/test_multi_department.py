"""Ko'p bo'limli murojaat — AI ikkinchi muammoni ham bo'limiga yuboradi
(docs/07-ai-layer.md §1.1, kontrakt v1.5).

Lokal o'lchovda «Uyimizda 2 kundan beri chiroq va suv to'xtab qoldi»
matni `kommunal` kategoriyasiga **`confidence=1.0`** bilan tushdi: AI
ikkala muammoni ham tushungan edi, lekin bitta kategoriya so'ralgani
uchun soyabon kategoriyani tanladi. `needs_review` qo'yilmadi va
Elektr ham, Suvsoz ham murojaatni umuman ko'rmadi.

Bu testlar LLM'ni **mock qiladi** — Ollama'ga bog'lanmaydi. Tekshiriladigan
narsa modelning aqli emas, `_create_ai_subtasks` dagi filtrlar: server
LLM'ga ishonmasligi kerak.
"""
import uuid

import pytest
from sqlalchemy import select

from app.models.category import Category
from app.models.complaint import Complaint
from app.models.complaint_subtask import ComplaintSubtask
from app.worker import _create_ai_subtasks


def _complaint(db_session, category_code: str = "elektr") -> tuple[Complaint, Category]:
    """Yo'naltirilgan murojaat yasaydi (worker'dan keyingi holat)."""
    category = db_session.execute(select(Category).where(Category.code == category_code)).scalar_one()
    citizen_id = db_session.execute(
        select(Complaint.citizen_id).limit(1)
    ).scalar_one_or_none()
    if citizen_id is None:  # bo'sh bazada fuqaro yasaymiz
        from app.models.citizen import Citizen

        citizen = Citizen(phone=f"+99890{uuid.uuid4().int % 10**7:07d}", first_name="Test", language="uz")
        db_session.add(citizen)
        db_session.flush()
        citizen_id = citizen.id

    complaint = Complaint(
        ticket_number=f"TEST-{uuid.uuid4().hex[:8]}",
        citizen_id=citizen_id,
        category_id=category.id,
        description="Uyimizda 2 kundan beri chiroq va suv to'xtab qoldi",
        status="ai_processed",
        assigned_department_id=category.department_id,
    )
    db_session.add(complaint)
    db_session.flush()
    return complaint, category


def _subtasks(db_session, complaint: Complaint) -> list[ComplaintSubtask]:
    return (
        db_session.execute(select(ComplaintSubtask).where(ComplaintSubtask.complaint_id == complaint.id))
        .scalars()
        .all()
    )


@pytest.mark.smoke
def test_second_problem_reaches_its_department(client, db_session):
    """«chiroq va suv» — suv bo'yicha alohida topshiriq ochiladi."""
    complaint, category = _complaint(db_session, "elektr")

    created = _create_ai_subtasks(db_session, complaint, ["suv"], category)
    assert created == 1

    subtasks = _subtasks(db_session, complaint)
    assert len(subtasks) == 1
    water = db_session.execute(select(Category).where(Category.code == "suv")).scalar_one()
    assert subtasks[0].department_id == water.department_id
    # AI yaratgan — xodim yo'q (M10).
    assert subtasks[0].created_by is None
    assert subtasks[0].status == "open"

    events = [e for e in complaint.events if e.event_type == "subtask_created"]
    assert len(events) == 1
    assert events[0].actor_type == "ai"
    assert events[0].payload["category_code"] == "suv"


@pytest.mark.smoke
def test_primary_category_is_not_duplicated(client, db_session):
    """LLM asosiy kategoriyani ikkinchi ro'yxatda ham qaytarsa — tashlanadi."""
    complaint, category = _complaint(db_session, "elektr")

    created = _create_ai_subtasks(db_session, complaint, ["elektr"], category)
    assert created == 0
    assert _subtasks(db_session, complaint) == []


@pytest.mark.smoke
def test_same_department_is_skipped(client, db_session):
    """Boshqa kategoriya, lekin AYNI bo'lim — topshiriq ochilmaydi.

    Aks holda bitta jamoa o'z ishi uchun o'ziga topshiriq olardi.

    Kategoriya seed'dan izlanmaydi, shu yerda yasaladi: aks holda test
    seed omadiga bog'liq bo'lib, bir bo'limga ikki kategoriya bo'lmasa
    jimgina o'tkazib yuborilardi — ya'ni filtr hech qachon sinalmasdi.
    """
    complaint, category = _complaint(db_session, "elektr")
    twin = Category(
        code=f"test_twin_{uuid.uuid4().hex[:6]}",
        names={"uz": "Sinov (ayni bo'lim)"},
        sla_hours=24,
        department_id=category.department_id,
        is_active=True,
    )
    db_session.add(twin)
    db_session.flush()

    created = _create_ai_subtasks(db_session, complaint, [twin.code], category)
    assert created == 0
    assert _subtasks(db_session, complaint) == []


@pytest.mark.smoke
def test_inactive_and_departmentless_categories_are_skipped(client, db_session):
    """Nofaol kategoriya va bo'limga bog'lanmagan kategoriya — ikkalasi
    ham topshiriq ochmaydi (biriga yuboradigan jamoa yo'q)."""
    complaint, category = _complaint(db_session, "elektr")
    orphan = Category(
        code=f"test_orphan_{uuid.uuid4().hex[:6]}",
        names={"uz": "Sinov (bo'limsiz)"},
        sla_hours=24,
        department_id=None,
        is_active=True,
    )
    inactive = Category(
        code=f"test_inactive_{uuid.uuid4().hex[:6]}",
        names={"uz": "Sinov (nofaol)"},
        sla_hours=24,
        department_id=category.department_id,
        is_active=False,
    )
    db_session.add_all([orphan, inactive])
    db_session.flush()

    created = _create_ai_subtasks(db_session, complaint, [orphan.code, inactive.code], category)
    assert created == 0


@pytest.mark.smoke
def test_unknown_code_is_ignored(client, db_session):
    """LLM o'ylab topgan kod tizimni yiqitmaydi."""
    complaint, category = _complaint(db_session, "elektr")

    created = _create_ai_subtasks(db_session, complaint, ["kosmik_nurlanish", ""], category)
    assert created == 0
    assert _subtasks(db_session, complaint) == []


@pytest.mark.smoke
def test_duplicate_departments_collapse(client, db_session):
    """Ikki xil kod bitta bo'limga tushsa — bitta topshiriq."""
    complaint, category = _complaint(db_session, "elektr")

    created = _create_ai_subtasks(db_session, complaint, ["suv", "suv"], category)
    assert created == 1


@pytest.mark.smoke
def test_ai_subtask_blocks_resolve(client, admin_headers, db_session):
    """AI topgan ikkinchi muammo yopilmaguncha murojaat «hal qilindi»
    bo'la olmaydi — fuqaroga chiroq tuzatilib, suv yo'q holda
    «hal qilindi» deyilmasligi kerak."""
    phone = f"+99896{uuid.uuid4().int % 10**7:07d}"
    submit = client.post(
        "/api/public/complaints",
        data={
            "description": "Uyimizda 2 kundan beri chiroq va suv to'xtab qoldi, hech kim kelmadi",
            "first_name": "Test",
            "phone": phone,
            "category_code": "elektr",
        },
    )
    assert submit.status_code == 201, submit.text
    ticket = submit.json()["ticket_number"]

    listing = client.get("/api/admin/complaints", params={"q": ticket}, headers=admin_headers)
    complaint_id = next(i["id"] for i in listing.json()["items"] if i["ticket_number"] == ticket)

    client.patch(
        f"/api/admin/complaints/{complaint_id}/status", json={"status": "ai_processed"}, headers=admin_headers
    )
    client.post(f"/api/admin/complaints/{complaint_id}/review", json={"reason": "ok"}, headers=admin_headers)

    complaint = db_session.get(Complaint, uuid.UUID(complaint_id))
    category = db_session.execute(select(Category).where(Category.code == "elektr")).scalar_one()
    assert _create_ai_subtasks(db_session, complaint, ["suv"], category) == 1
    db_session.flush()

    client.patch(
        f"/api/admin/complaints/{complaint_id}/status", json={"status": "in_progress"}, headers=admin_headers
    )
    blocked = client.patch(
        f"/api/admin/complaints/{complaint_id}/status",
        json={"status": "resolved", "reply_text": "Chiroq tiklandi."},
        headers=admin_headers,
    )
    assert blocked.status_code == 422, blocked.text
    assert blocked.json()["code"] == "subtasks_open"

    detail = client.get(f"/api/admin/complaints/{complaint_id}", headers=admin_headers).json()
    ai_subtask = next(s for s in detail["subtasks"] if s["created_by_ai"])
    assert ai_subtask["department_name"]

    closed = client.patch(
        f"/api/admin/subtasks/{ai_subtask['id']}", json={"status": "done"}, headers=admin_headers
    )
    assert closed.status_code == 200, closed.text

    now_ok = client.patch(
        f"/api/admin/complaints/{complaint_id}/status",
        json={"status": "resolved", "reply_text": "Chiroq va suv ta'minoti tiklandi."},
        headers=admin_headers,
    )
    assert now_ok.status_code == 200, now_ok.text
