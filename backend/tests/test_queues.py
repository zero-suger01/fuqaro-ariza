"""Operatsion navbat — `stats/queues` va ro'yxat filtrlari
(docs/03-kontraktlar.md §5, docs/10-ui-ux.md §10.1).

Asosiy shart: **karta raqami va karta bosilganda ochiladigan ro'yxat
bir xil shartdan chiqadi**. Ular farq qilsa panelga ishonch qolmaydi,
shuning uchun har navbat uchun ikkisi ham tekshiriladi.
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.models.complaint import Complaint


def _submit(client, description: str = "Ko'chada chiroq yonmayapti, kechasi qorong'i") -> tuple[str, str]:
    phone = f"+99895{uuid.uuid4().int % 10**7:07d}"
    response = client.post(
        "/api/public/complaints",
        data={"description": description, "first_name": "Test", "phone": phone},
    )
    assert response.status_code == 201, response.text
    return response.json()["ticket_number"], phone


def _find(db_session, ticket: str) -> Complaint:
    return db_session.query(Complaint).filter(Complaint.ticket_number == ticket).one()


def _queues(client, admin_headers) -> dict:
    response = client.get("/api/admin/stats/queues", headers=admin_headers)
    assert response.status_code == 200, response.text
    return response.json()


def _list_ids(client, admin_headers, **params) -> set[str]:
    response = client.get(
        "/api/admin/complaints", params={**params, "page_size": 100}, headers=admin_headers
    )
    assert response.status_code == 200, response.text
    return {item["id"] for item in response.json()["items"]}


@pytest.mark.smoke
def test_queues_shape_and_departments(client, admin_headers):
    body = _queues(client, admin_headers)
    for key in ("unassigned", "ai_exceptions", "sla_risk", "overdue", "awaiting_info", "stuck_ai"):
        assert isinstance(body[key], int), key
    assert body["by_department"], "seed'da faol bo'limlar bo'lishi kerak"
    row = body["by_department"][0]
    for key in ("department_name", "new", "in_progress", "sla_risk", "overdue", "unowned", "over_limit"):
        assert key in row, key


@pytest.mark.smoke
def test_new_complaint_counts_as_unassigned(client, admin_headers, db_session):
    before = _queues(client, admin_headers)["unassigned"]
    ticket, _ = _submit(client)
    after = _queues(client, admin_headers)

    assert after["unassigned"] == before + 1
    assert str(_find(db_session, ticket).id) in _list_ids(client, admin_headers, unassigned=True)


@pytest.mark.smoke
def test_overdue_card_matches_the_list(client, admin_headers, db_session):
    ticket, _ = _submit(client)
    complaint = _find(db_session, ticket)

    before = _queues(client, admin_headers)["overdue"]
    complaint.deadline_at = datetime.now(timezone.utc) - timedelta(hours=1)
    db_session.flush()

    after = _queues(client, admin_headers)
    assert after["overdue"] == before + 1
    assert str(complaint.id) in _list_ids(client, admin_headers, overdue=True)
    # Muddati o'tgan ish SLA-xavf navbatida takrorlanmaydi.
    assert str(complaint.id) not in _list_ids(client, admin_headers, sla_risk=True)


@pytest.mark.smoke
def test_sla_risk_uses_the_75_percent_threshold(client, admin_headers, db_session):
    """Chegara `escalation.py` dagi `sla_warning` bilan bir xil — xabar
    olgan xodim ishni navbatda topishi kerak."""
    ticket, _ = _submit(client)
    complaint = _find(db_session, ticket)
    now = datetime.now(timezone.utc)

    # 50% sarflangan — hali xavf emas.
    complaint.created_at = now - timedelta(hours=5)
    complaint.deadline_at = now + timedelta(hours=5)
    db_session.flush()
    assert str(complaint.id) not in _list_ids(client, admin_headers, sla_risk=True)

    # 90% sarflangan — xavf.
    complaint.created_at = now - timedelta(hours=9)
    complaint.deadline_at = now + timedelta(hours=1)
    db_session.flush()

    assert str(complaint.id) in _list_ids(client, admin_headers, sla_risk=True)
    assert _queues(client, admin_headers)["sla_risk"] >= 1


@pytest.mark.smoke
def test_stuck_ai_catches_silent_llm(client, admin_headers, db_session):
    """`status=new` da 1 soatdan ko'p turgan murojaat — LLM javob
    bermagani (docs/07 §2.3). Sukut bo'yicha bu navbat bo'sh bo'lishi
    kerak, ichida yozuv paydo bo'lishi uzilish signali."""
    ticket, _ = _submit(client)
    complaint = _find(db_session, ticket)
    assert complaint.status == "new"

    assert str(complaint.id) not in _list_ids(client, admin_headers, stuck_ai=True)

    complaint.created_at = datetime.now(timezone.utc) - timedelta(hours=2)
    db_session.flush()

    assert str(complaint.id) in _list_ids(client, admin_headers, stuck_ai=True)
    assert _queues(client, admin_headers)["stuck_ai"] >= 1


@pytest.mark.smoke
def test_awaiting_info_needs_24_hours(client, admin_headers, db_session):
    ticket, _ = _submit(client)
    complaint = _find(db_session, ticket)
    complaint_id = str(complaint.id)

    client.patch(f"/api/admin/complaints/{complaint_id}/status", json={"status": "ai_processed"}, headers=admin_headers)
    client.post(f"/api/admin/complaints/{complaint_id}/review", json={"reason": "ok"}, headers=admin_headers)
    asked = client.patch(
        f"/api/admin/complaints/{complaint_id}/status",
        json={"status": "need_info", "note": "Aniq manzilni yozing"},
        headers=admin_headers,
    )
    assert asked.status_code == 200, asked.text

    # Hozir so'ralgan — hali follow-up vaqti emas.
    assert complaint_id not in _list_ids(client, admin_headers, need_info_over_hours=24)

    complaint.info_requested_at = datetime.now(timezone.utc) - timedelta(hours=30)
    db_session.flush()

    assert complaint_id in _list_ids(client, admin_headers, need_info_over_hours=24)
    assert _queues(client, admin_headers)["awaiting_info"] >= 1


@pytest.mark.smoke
def test_wip_limit_flags_but_does_not_block(client, admin_headers, db_session):
    """`wip_limit` faqat ko'rsatkich — hech narsani bloklamaydi ([04])."""
    from app.models.department import Department

    ticket, _ = _submit(client)
    complaint_id = str(_find(db_session, ticket).id)
    client.patch(f"/api/admin/complaints/{complaint_id}/status", json={"status": "ai_processed"}, headers=admin_headers)
    assigned = client.post(
        f"/api/admin/complaints/{complaint_id}/review", json={"reason": "ok"}, headers=admin_headers
    )
    department_id = assigned.json()["department"]["id"]

    department = db_session.get(Department, uuid.UUID(department_id))
    department.wip_limit = 0
    db_session.flush()

    row = next(r for r in _queues(client, admin_headers)["by_department"] if r["department_id"] == department_id)
    assert row["wip_limit"] == 0
    assert row["over_limit"] is True

    # Limit oshgan bo'lsa ham ish davom etadi.
    still_works = client.patch(
        f"/api/admin/complaints/{complaint_id}/status", json={"status": "in_progress"}, headers=admin_headers
    )
    assert still_works.status_code == 200, still_works.text


@pytest.mark.smoke
def test_subtask_blocks_resolve(client, admin_headers, db_session):
    """Ochiq idoralararo topshiriq bilan `resolved` — 422 `subtasks_open`."""
    ticket, _ = _submit(client)
    complaint_id = str(_find(db_session, ticket).id)
    client.patch(f"/api/admin/complaints/{complaint_id}/status", json={"status": "ai_processed"}, headers=admin_headers)
    client.post(f"/api/admin/complaints/{complaint_id}/review", json={"reason": "ok"}, headers=admin_headers)
    client.patch(f"/api/admin/complaints/{complaint_id}/status", json={"status": "in_progress"}, headers=admin_headers)

    departments = client.get("/api/admin/departments", headers=admin_headers).json()
    other = next(d for d in departments if d["code"] == "suvsoz")
    created = client.post(
        f"/api/admin/complaints/{complaint_id}/subtasks",
        json={"department_id": other["id"], "note": "Drenaj quvurini tekshirish"},
        headers=admin_headers,
    )
    assert created.status_code == 201, created.text
    subtask_id = created.json()["subtasks"][0]["id"]

    blocked = client.patch(
        f"/api/admin/complaints/{complaint_id}/status",
        json={"status": "resolved", "reply_text": "Hal qilindi."},
        headers=admin_headers,
    )
    assert blocked.status_code == 422, blocked.text
    assert blocked.json()["code"] == "subtasks_open"

    closed = client.patch(f"/api/admin/subtasks/{subtask_id}", json={"status": "done"}, headers=admin_headers)
    assert closed.status_code == 200, closed.text

    now_ok = client.patch(
        f"/api/admin/complaints/{complaint_id}/status",
        json={"status": "resolved", "reply_text": "Drenaj tozalandi, muammo hal bo'ldi."},
        headers=admin_headers,
    )
    assert now_ok.status_code == 200, now_ok.text
