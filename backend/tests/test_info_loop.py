"""`need_info` sikli — uchala kanal (docs/03-kontraktlar.md §3.5, §6, §5).

QA tekshiruvidagi 1-raqamli P0: xodim murojaatni «Ma'lumot kutilmoqda»
ga o'tkaza olardi, lekin fuqaro javob qaytara olmasdi va «qanday
ma'lumot kerak» degan matn hech qayerda saqlanmasdi — murojaat shu
ustunda cheksiz qolib ketishi mumkin edi.
"""
import uuid

import pytest


def _assigned_complaint(client, admin_headers) -> tuple[str, str, str]:
    """Murojaatni `assigned` holatiga keltiradi (ticket, phone, id)."""
    phone = f"+99893{uuid.uuid4().int % 10**7:07d}"
    submit = client.post(
        "/api/public/complaints",
        data={
            "description": "Ko'chamizda chiqindi konteyneri to'lib ketgan, hid tarqalmoqda",
            "first_name": "Test",
            "phone": phone,
        },
    )
    assert submit.status_code == 201, submit.text
    ticket = submit.json()["ticket_number"]

    listing = client.get("/api/admin/complaints", params={"q": ticket}, headers=admin_headers)
    complaint_id = next(i["id"] for i in listing.json()["items"] if i["ticket_number"] == ticket)

    client.patch(
        f"/api/admin/complaints/{complaint_id}/status", json={"status": "ai_processed"}, headers=admin_headers
    )
    review = client.post(
        f"/api/admin/complaints/{complaint_id}/review", json={"reason": "ok"}, headers=admin_headers
    )
    assert review.status_code == 200, review.text
    return ticket, phone, complaint_id


def _request_info(client, admin_headers, complaint_id: str, question: str):
    return client.patch(
        f"/api/admin/complaints/{complaint_id}/status",
        json={"status": "need_info", "note": question},
        headers=admin_headers,
    )


@pytest.mark.smoke
def test_need_info_requires_a_question(client, admin_headers):
    """Sabab matnisiz `need_info` — 422. Avval bu tugma `note` yubormasdi
    va fuqaro nima kerakligini bilmasdi."""
    _, _, complaint_id = _assigned_complaint(client, admin_headers)

    bare = client.patch(
        f"/api/admin/complaints/{complaint_id}/status", json={"status": "need_info"}, headers=admin_headers
    )
    assert bare.status_code == 422, bare.text
    assert bare.json()["code"] == "validation_error"

    blank = _request_info(client, admin_headers, complaint_id, "   ")
    assert blank.status_code == 422, blank.text


@pytest.mark.smoke
def test_question_reaches_the_citizen(client, admin_headers):
    ticket, phone, complaint_id = _assigned_complaint(client, admin_headers)
    question = "Uy raqamingizni va konteyner qachondan to'lib turganini yozing"

    assert _request_info(client, admin_headers, complaint_id, question).status_code == 200

    track = client.get("/api/public/complaints/track", params={"ticket": ticket, "phone": phone})
    assert track.status_code == 200, track.text
    body = track.json()
    assert body["need_info"] is True
    assert body["info_request_text"] == question
    assert body["info_provided"] is False


@pytest.mark.smoke
def test_web_answer_resumes_work(client, admin_headers):
    """Web kanali: fuqaro javob berishi murojaatni avtomatik `in_progress`
    ga qaytaradi ([03] §3.5)."""
    ticket, phone, complaint_id = _assigned_complaint(client, admin_headers)
    _request_info(client, admin_headers, complaint_id, "Uy raqamingizni yozing")

    answer = client.post(
        "/api/public/complaints/info",
        data={"ticket": ticket, "phone": phone, "text": "Uy raqami 12, uch kundan beri to'lib turadi"},
    )
    assert answer.status_code == 200, answer.text
    assert answer.json()["accepted"] is True
    assert answer.json()["status_simple"] == "ijroda"

    detail = client.get(f"/api/admin/complaints/{complaint_id}", headers=admin_headers).json()
    assert detail["status"] == "in_progress"
    assert len(detail["citizen_messages"]) == 1
    assert detail["citizen_messages"][0]["source"] == "web"
    assert detail["info_provided_at"] is not None
    assert any(e["event_type"] == "info_provided" for e in detail["events"])

    track = client.get("/api/public/complaints/track", params={"ticket": ticket, "phone": phone})
    assert track.json()["need_info"] is False
    assert track.json()["info_provided"] is True


@pytest.mark.smoke
def test_web_answer_rejects_wrong_phone(client, admin_headers):
    """Identifikatsiya `track` bilan bir xil — noto'g'ri telefon 404
    (murojaat mavjudligi oshkor qilinmaydi)."""
    ticket, _, complaint_id = _assigned_complaint(client, admin_headers)
    _request_info(client, admin_headers, complaint_id, "Uy raqamingizni yozing")

    response = client.post(
        "/api/public/complaints/info",
        data={"ticket": ticket, "phone": "+998900000009", "text": "Uy raqami 12"},
    )
    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


@pytest.mark.smoke
def test_manual_channel_keeps_status(client, admin_headers, staff_headers):
    """Manual kanal ATAYLAB statusni o'zgartirmaydi — fuqaro rostdan
    javob berganini faqat xodim biladi ([03] §5)."""
    ticket, phone, complaint_id = _assigned_complaint(client, admin_headers)
    _request_info(client, admin_headers, complaint_id, "Uy raqamingizni yozing")

    recorded = client.post(
        f"/api/admin/complaints/{complaint_id}/citizen-info",
        json={"text": "Fuqaro telefonda aytdi: uy raqami 12"},
        headers=admin_headers,
    )
    assert recorded.status_code == 201, recorded.text
    body = recorded.json()
    # Status o'zgarmadi — xodim o'zi qaytaradi.
    assert body["status"] == "need_info"
    assert body["citizen_messages"][-1]["source"] == "manual"
    assert body["citizen_messages"][-1]["recorded_by"] is not None

    resumed = client.patch(
        f"/api/admin/complaints/{complaint_id}/status", json={"status": "in_progress"}, headers=admin_headers
    )
    assert resumed.status_code == 200, resumed.text
    assert resumed.json()["status"] == "in_progress"


@pytest.mark.smoke
def test_answer_on_rejected_complaint_is_refused(client, admin_headers):
    ticket, phone, complaint_id = _assigned_complaint(client, admin_headers)
    client.patch(
        f"/api/admin/complaints/{complaint_id}/status",
        json={"status": "rejected", "note": "Hudud tumanga tegishli emas"},
        headers=admin_headers,
    )

    response = client.post(
        "/api/public/complaints/info",
        data={"ticket": ticket, "phone": phone, "text": "Yana bir narsa qo'shmoqchiman"},
    )
    assert response.status_code == 422, response.text
    assert response.json()["code"] == "validation_error"


@pytest.mark.smoke
def test_feedback_reopens_and_staff_cannot(client, admin_headers):
    """Fuqaro e'tirozi murojaatni qayta ochadi; xodim esa yopilgan
    murojaatni o'zicha qayta ocha olmaydi ([03] §2.1, §3.6)."""
    ticket, phone, complaint_id = _assigned_complaint(client, admin_headers)
    client.patch(
        f"/api/admin/complaints/{complaint_id}/status", json={"status": "in_progress"}, headers=admin_headers
    )
    client.patch(
        f"/api/admin/complaints/{complaint_id}/status",
        json={"status": "resolved", "reply_text": "Konteyner bo'shatildi."},
        headers=admin_headers,
    )

    # Xodim uchun resolved -> in_progress yopiq.
    staff_reopen = client.patch(
        f"/api/admin/complaints/{complaint_id}/status", json={"status": "in_progress"}, headers=admin_headers
    )
    assert staff_reopen.status_code == 422, staff_reopen.text
    assert staff_reopen.json()["code"] == "invalid_transition"

    feedback = client.post(
        "/api/public/complaints/feedback",
        json={"ticket": ticket, "phone": phone, "satisfied": False, "comment": "Konteyner hamon to'lib turadi"},
    )
    assert feedback.status_code == 200, feedback.text
    assert feedback.json()["reopened"] is True

    detail = client.get(f"/api/admin/complaints/{complaint_id}", headers=admin_headers).json()
    assert detail["status"] == "in_progress"
    assert detail["reopened_count"] == 1
    assert detail["satisfaction"] is False
    assert any(e["event_type"] == "reopened" for e in detail["events"])

    # Ikkinchi baho — 409.
    again = client.post(
        "/api/public/complaints/feedback",
        json={"ticket": ticket, "phone": phone, "satisfied": True},
    )
    assert again.status_code == 409, again.text


@pytest.mark.smoke
def test_satisfied_feedback_closes(client, admin_headers):
    ticket, phone, complaint_id = _assigned_complaint(client, admin_headers)
    client.patch(
        f"/api/admin/complaints/{complaint_id}/status", json={"status": "in_progress"}, headers=admin_headers
    )
    client.patch(
        f"/api/admin/complaints/{complaint_id}/status",
        json={"status": "resolved", "reply_text": "Konteyner bo'shatildi."},
        headers=admin_headers,
    )

    feedback = client.post(
        "/api/public/complaints/feedback", json={"ticket": ticket, "phone": phone, "satisfied": True}
    )
    assert feedback.status_code == 200, feedback.text
    assert feedback.json()["reopened"] is False
    # Rozi bo'lsa 7 kunlik avto-yopish kutilmaydi ([03] §3.6).
    assert feedback.json()["status_simple"] == "yakunlandi"

    detail = client.get(f"/api/admin/complaints/{complaint_id}", headers=admin_headers).json()
    assert detail["status"] == "closed"
    assert detail["satisfaction"] is True
