"""Uchdan-uchga asosiy oqim: guest submit → ticket → track → admin
ro'yxati → status o'zgarishi.

Alohida test bazasida ishlaydi (`tests/conftest.py`), shu sabab LLM
worker'i bilan poyga holati YO'Q: worker dev bazasiga ulangan va test
murojaatlarini ko'rmaydi, murojaat esa `new` da qoladi. Avval bu testlar
«worker allaqachon statusni o'zgartirgan bo'lishi mumkin» degan
tekshiruvlarga to'la edi va aslida nimani tasdiqlayotgani noaniq edi.
"""
import uuid

import pytest


def _submit(client, description: str, phone: str | None = None) -> tuple[str, str]:
    phone = phone or f"+99890{uuid.uuid4().int % 10**7:07d}"
    response = client.post(
        "/api/public/complaints",
        data={"description": description, "first_name": "Test", "phone": phone},
    )
    assert response.status_code == 201, response.text
    return response.json()["ticket_number"], phone


def _complaint_id(client, headers: dict[str, str], ticket: str) -> str:
    listing = client.get("/api/admin/complaints", params={"q": ticket}, headers=headers)
    assert listing.status_code == 200, listing.text
    return next(item["id"] for item in listing.json()["items"] if item["ticket_number"] == ticket)


@pytest.mark.smoke
def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.smoke
def test_guest_submit_track_admin_flow(client, admin_headers):
    ticket, phone = _submit(client, "Yo'lda katta chuqur bor, mashinalar zarar ko'rmoqda")

    track = client.get("/api/public/complaints/track", params={"ticket": ticket, "phone": phone})
    assert track.status_code == 200, track.text
    body = track.json()
    assert body["ticket_number"] == ticket
    # v1.3: intake paytida klassifikatsiya YO'Q — kategoriya `boshqa` bo'lib
    # turadi, LLM keyin almashtiradi (docs/07 §1).
    assert body["category"]["code"] == "boshqa"
    # v1.4: muddat intake paytida qo'yiladi — LLM ishlamasa ham murojaat
    # SLA/eskalatsiya radarida qoladi.
    assert body["deadline_at"] is not None

    # Enumeration protection: wrong phone for a real ticket still 404s.
    wrong = client.get("/api/public/complaints/track", params={"ticket": ticket, "phone": "+998900000001"})
    assert wrong.status_code == 404
    assert wrong.json()["code"] == "not_found"

    complaint_id = _complaint_id(client, admin_headers, ticket)

    status_change = client.patch(
        f"/api/admin/complaints/{complaint_id}/status", json={"status": "ai_processed"}, headers=admin_headers
    )
    assert status_change.status_code == 200, status_change.text
    assert status_change.json()["status"] == "ai_processed"

    track_after = client.get("/api/public/complaints/track", params={"ticket": ticket, "phone": phone})
    assert track_after.json()["timeline"][0]["done"] is True

    # rejected sababsiz o'tmaydi (docs/03 §2.1)
    reject = client.patch(
        f"/api/admin/complaints/{complaint_id}/status", json={"status": "rejected"}, headers=admin_headers
    )
    assert reject.status_code == 422
    assert reject.json()["code"] == "validation_error"


@pytest.mark.smoke
def test_resolved_requires_reply_and_review_flow(client, admin_headers):
    """R0/Q2-Q3: resolved javobsiz 422 reply_required; reply_text bilan bitta
    so'rovda javob+status; review endpointi needs_review'ni yopadi."""
    ticket, phone = _submit(client, "Ko'chamizda suv quvuri yorilib ketdi, hovlilarni suv bosmoqda")
    complaint_id = _complaint_id(client, admin_headers, ticket)

    client.patch(
        f"/api/admin/complaints/{complaint_id}/status", json={"status": "ai_processed"}, headers=admin_headers
    )

    # v1.4: review uchun sabab majburiy — sababsiz 422.
    no_reason = client.post(f"/api/admin/complaints/{complaint_id}/review", json={}, headers=admin_headers)
    assert no_reason.status_code == 422, no_reason.text

    review = client.post(
        f"/api/admin/complaints/{complaint_id}/review", json={"reason": "ok"}, headers=admin_headers
    )
    assert review.status_code == 200, review.text
    assert review.json()["status"] == "assigned"
    assert review.json()["needs_review"] is False
    assert review.json()["department"] is not None

    # Track endi bo'limni ko'rsatadi (R0/Q5)
    track = client.get("/api/public/complaints/track", params={"ticket": ticket, "phone": phone})
    assert track.status_code == 200
    assert track.json()["department"] is not None

    client.patch(
        f"/api/admin/complaints/{complaint_id}/status", json={"status": "in_progress"}, headers=admin_headers
    )

    bare = client.patch(
        f"/api/admin/complaints/{complaint_id}/status", json={"status": "resolved"}, headers=admin_headers
    )
    assert bare.status_code == 422, bare.text
    assert bare.json()["code"] == "reply_required"

    resolved = client.patch(
        f"/api/admin/complaints/{complaint_id}/status",
        json={"status": "resolved", "reply_text": "Hurmatli fuqaro, quvur ta'mirlandi."},
        headers=admin_headers,
    )
    assert resolved.status_code == 200, resolved.text
    assert resolved.json()["status"] == "resolved"
    assert len(resolved.json()["replies"]) == 1

    track_after = client.get("/api/public/complaints/track", params={"ticket": ticket, "phone": phone})
    assert track_after.json()["reply_text"] == "Hurmatli fuqaro, quvur ta'mirlandi."
    # v1.4: yakunlangan murojaatga baho berish mumkin.
    assert track_after.json()["can_give_feedback"] is True


@pytest.mark.smoke
def test_categories_and_neighborhoods(client):
    categories = client.get("/api/public/categories")
    assert categories.status_code == 200
    codes = {c["code"] for c in categories.json()}
    assert "yol" in codes and "boshqa" in codes

    neighborhoods = client.get("/api/public/neighborhoods")
    assert neighborhoods.status_code == 200


@pytest.mark.smoke
def test_rate_of_bad_input_returns_error_envelope(client):
    response = client.post(
        "/api/public/complaints", data={"description": "short", "first_name": "A", "phone": "+998901234567"}
    )
    assert response.status_code == 422
    assert set(response.json().keys()) == {"detail", "code"}
