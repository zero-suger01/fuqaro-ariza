"""Egalik — «Qabul qilaman» va `assigned_user_id` barqarorligi
(docs/03-kontraktlar.md §2.1, §5).

QA tekshiruvidagi 2- va 3-raqamli P0:

1. Tafsilot sahifasini ochish `accepted` qilib qo'yardi — «ko'rdim»
   «qabul qildim» bilan tenglashardi, mas'ul xodim aniqlanmasdi, va
   API'ni to'g'ridan-to'g'ri ishlatgan klient bu bosqichni butunlay
   o'tkazib yuborardi.
2. `assigned_user_id` AI routing va `review` da har safar `None` ga
   qaytarilardi — adminning qo'lda tayinlagan xodimi jimgina yo'qolardi.
"""
import uuid

import pytest


def _assigned_to_sanitation(client, admin_headers) -> str:
    """Chiqindi murojaati → Sanitariya bo'limi (seed'dagi bog'lanish)."""
    phone = f"+99894{uuid.uuid4().int % 10**7:07d}"
    submit = client.post(
        "/api/public/complaints",
        data={
            "description": "Mahalla ichida chiqindi uyumlari yig'ilib qolgan, olib ketilmayapti",
            "first_name": "Test",
            "phone": phone,
            "category_code": "chiqindi",
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
    assert review.json()["department"]["code"] == "sanitariya"
    return complaint_id


@pytest.mark.smoke
def test_opening_does_not_accept(client, admin_headers, staff_headers):
    """Sahifani ochish (GET) hech qanday holatni o'zgartirmaydi."""
    complaint_id = _assigned_to_sanitation(client, admin_headers)

    first = client.get(f"/api/admin/complaints/{complaint_id}", headers=staff_headers)
    assert first.status_code == 200, first.text
    assert first.json()["status"] == "assigned"
    assert first.json()["accepted_at"] is None
    assert first.json()["assigned_user_id"] is None

    second = client.get(f"/api/admin/complaints/{complaint_id}", headers=staff_headers)
    assert second.json()["status"] == "assigned"


@pytest.mark.smoke
def test_claim_sets_owner_and_accepts(client, admin_headers, staff_headers):
    complaint_id = _assigned_to_sanitation(client, admin_headers)

    claimed = client.post(f"/api/admin/complaints/{complaint_id}/claim", headers=staff_headers)
    assert claimed.status_code == 200, claimed.text
    body = claimed.json()
    assert body["status"] == "accepted"
    assert body["assigned_user_id"] is not None
    assert body["assigned_user_name"]
    assert body["accepted_at"] is not None
    assert any(e["event_type"] == "claimed" for e in body["events"])


@pytest.mark.smoke
def test_claim_is_idempotent_for_the_owner(client, admin_headers, staff_headers):
    """Egasi qayta bosса ish orqaga surilmaydi va xato ham bermaydi."""
    complaint_id = _assigned_to_sanitation(client, admin_headers)
    client.post(f"/api/admin/complaints/{complaint_id}/claim", headers=staff_headers)
    client.patch(
        f"/api/admin/complaints/{complaint_id}/status", json={"status": "in_progress"}, headers=staff_headers
    )

    again = client.post(f"/api/admin/complaints/{complaint_id}/claim", headers=staff_headers)
    assert again.status_code == 200, again.text
    # Qabul qilish ishni `accepted` ga qaytarib yubormaydi.
    assert again.json()["status"] == "in_progress"


@pytest.mark.smoke
def test_claim_from_another_department_is_forbidden(client, admin_headers):
    """Admin (bo'limi yo'q) ham boshqa bo'lim ishini o'ziga ola olmaydi —
    u biriktiradi, bajarmaydi."""
    complaint_id = _assigned_to_sanitation(client, admin_headers)

    response = client.post(f"/api/admin/complaints/{complaint_id}/claim", headers=admin_headers)
    assert response.status_code == 403, response.text
    assert response.json()["code"] == "forbidden"


@pytest.mark.smoke
def test_reassign_to_same_department_keeps_owner(client, admin_headers, staff_headers):
    """Bo'lim o'zgarmasa egasi saqlanadi ([03] §5 «Egalik qoidasi»)."""
    complaint_id = _assigned_to_sanitation(client, admin_headers)
    claimed = client.post(f"/api/admin/complaints/{complaint_id}/claim", headers=staff_headers)
    owner_id = claimed.json()["assigned_user_id"]
    department_id = claimed.json()["department"]["id"]

    again = client.post(
        f"/api/admin/complaints/{complaint_id}/assign",
        json={"department_id": department_id},
        headers=admin_headers,
    )
    assert again.status_code == 200, again.text
    assert again.json()["assigned_user_id"] == owner_id


@pytest.mark.smoke
def test_reassign_to_other_department_clears_owner(client, admin_headers, staff_headers):
    """Bo'lim o'zgarsa egasi tozalanadi — yangi bo'limda u xodim ishlamaydi."""
    complaint_id = _assigned_to_sanitation(client, admin_headers)
    client.post(f"/api/admin/complaints/{complaint_id}/claim", headers=staff_headers)

    departments = client.get("/api/admin/departments", headers=admin_headers).json()
    other = next(d for d in departments if d["code"] == "suvsoz")

    moved = client.post(
        f"/api/admin/complaints/{complaint_id}/assign",
        json={"department_id": other["id"]},
        headers=admin_headers,
    )
    assert moved.status_code == 200, moved.text
    assert moved.json()["assigned_user_id"] is None
    assert moved.json()["accepted_at"] is None


@pytest.mark.smoke
def test_assign_validates_the_user(client, admin_headers):
    """Boshqa bo'lim xodimini biriktirish — 422. Avval bu maydon umuman
    tekshirilmasdi va murojaat hech kimning navbatida ko'rinmay qolardi."""
    complaint_id = _assigned_to_sanitation(client, admin_headers)
    departments = client.get("/api/admin/departments", headers=admin_headers).json()
    sanitation = next(d for d in departments if d["code"] == "sanitariya")
    water = next(d for d in departments if d["code"] == "suvsoz")

    users = client.get("/api/admin/users", headers=admin_headers).json()
    water_staff = next((u for u in users if u.get("department_id") == water["id"]), None)
    assert water_staff is not None, "demo seed'da suvsoz xodimi bo'lishi kerak"

    mismatch = client.post(
        f"/api/admin/complaints/{complaint_id}/assign",
        json={"department_id": sanitation["id"], "assigned_user_id": water_staff["id"]},
        headers=admin_headers,
    )
    assert mismatch.status_code == 422, mismatch.text
    assert mismatch.json()["code"] == "validation_error"

    missing = client.post(
        f"/api/admin/complaints/{complaint_id}/assign",
        json={"department_id": sanitation["id"], "assigned_user_id": str(uuid.uuid4())},
        headers=admin_headers,
    )
    assert missing.status_code == 422, missing.text


@pytest.mark.smoke
def test_mine_filter_splits_the_queue(client, admin_headers, staff_headers):
    """`mine=true` — «Mening ishlarim»; egasiz ishlar unda ko'rinmaydi."""
    mine_only = _assigned_to_sanitation(client, admin_headers)
    unowned = _assigned_to_sanitation(client, admin_headers)
    client.post(f"/api/admin/complaints/{mine_only}/claim", headers=staff_headers)

    mine = client.get("/api/admin/complaints", params={"mine": True}, headers=staff_headers)
    assert mine.status_code == 200, mine.text
    ids = {i["id"] for i in mine.json()["items"]}
    assert mine_only in ids
    assert unowned not in ids

    unassigned = client.get("/api/admin/complaints", params={"unassigned": True}, headers=staff_headers)
    unassigned_ids = {i["id"] for i in unassigned.json()["items"]}
    assert unowned in unassigned_ids
