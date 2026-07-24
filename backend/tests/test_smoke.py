"""B1 acceptance flow (docs/05-backend-tasklar.md B1 checkpoint C1):
guest submit -> ticket -> track -> admin list -> status change.

Runs against the docker-compose Postgres/MinIO/Redis with migrations and
seed already applied — no separate test database is set up yet.
"""
import uuid

import pytest


@pytest.mark.smoke
def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.smoke
def test_guest_submit_track_admin_flow(client):
    phone = f"+99890{uuid.uuid4().int % 10**7:07d}"

    submit = client.post(
        "/api/public/complaints",
        data={
            "description": "Yo'lda katta chuqur bor, mashinalar zarar ko'rmoqda",
            "first_name": "Test",
            "phone": phone,
        },
    )
    assert submit.status_code == 201, submit.text
    body = submit.json()
    assert body["status"] == "new"
    assert body["status_simple"] == "qabul_qilindi"
    ticket = body["ticket_number"]

    track = client.get("/api/public/complaints/track", params={"ticket": ticket, "phone": phone})
    assert track.status_code == 200, track.text
    assert track.json()["ticket_number"] == ticket
    assert track.json()["category"]["code"] == "yol"

    # Enumeration protection: wrong phone for a real ticket still 404s.
    wrong = client.get("/api/public/complaints/track", params={"ticket": ticket, "phone": "+998900000001"})
    assert wrong.status_code == 404
    assert wrong.json()["code"] == "not_found"

    login = client.post("/api/auth/login", json={"login": "+998900000000", "password": "admin123"})
    assert login.status_code == 200, login.text
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    listing = client.get("/api/admin/complaints", params={"q": ticket}, headers=headers)
    assert listing.status_code == 200, listing.text
    items = listing.json()["items"]
    assert any(item["ticket_number"] == ticket for item in items)
    complaint_id = next(item["id"] for item in items if item["ticket_number"] == ticket)

    status_change = client.patch(
        f"/api/admin/complaints/{complaint_id}/status", json={"status": "ai_processed"}, headers=headers
    )
    assert status_change.status_code == 200, status_change.text
    assert status_change.json()["status"] == "ai_processed"

    track_after = client.get("/api/public/complaints/track", params={"ticket": ticket, "phone": phone})
    assert track_after.json()["timeline"][0]["done"] is True

    # rejected requires a note
    reject = client.patch(
        f"/api/admin/complaints/{complaint_id}/status", json={"status": "rejected"}, headers=headers
    )
    assert reject.status_code == 422
    assert reject.json()["code"] == "validation_error"


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
