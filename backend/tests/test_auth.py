"""Xodim profili: ism/familiya tahrirlash, avatar, parolni tiklash
(docs/03-kontraktlar.md §4, v1.7)."""
from app.core.redisdb import redis_client

from tests.conftest import TEST_ADMIN_PASSWORD, TEST_ADMIN_PHONE


def test_update_me_changes_name(client, admin_headers):
    res = client.patch("/api/auth/me", json={"first_name": "Yangi", "last_name": "Ism"}, headers=admin_headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["first_name"] == "Yangi"
    assert body["last_name"] == "Ism"
    assert body["fullname"] == "Yangi Ism"


def test_update_me_partial_leaves_other_fields(client, admin_headers):
    before = client.get("/api/auth/me", headers=admin_headers).json()
    res = client.patch("/api/auth/me", json={"first_name": "FaqatIsm"}, headers=admin_headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["first_name"] == "FaqatIsm"
    assert body["last_name"] == before["last_name"]


def test_update_me_email_conflict(client, admin_headers, staff_headers):
    taken = client.patch("/api/auth/me", json={"email": "band@example.uz"}, headers=admin_headers)
    assert taken.status_code == 200, taken.text

    conflict = client.patch("/api/auth/me", json={"email": "band@example.uz"}, headers=staff_headers)
    assert conflict.status_code == 400
    assert conflict.json()["code"] == "already_exists"


def test_forgot_password_then_reset_full_flow(client):
    # Eskiz sozlanmagan (dev/test) — send_sms jimgina False qaytaradi, kod
    # baribir Redis'ga yoziladi va SMS yuborilmasa ham oqim davom etadi.
    forgot = client.post("/api/auth/forgot-password", json={"phone": TEST_ADMIN_PHONE})
    assert forgot.status_code == 200, forgot.text

    code = redis_client.get(f"pwreset:code:{TEST_ADMIN_PHONE}")
    assert code is not None and len(code) == 6

    bad = client.post(
        "/api/auth/reset-password",
        json={"phone": TEST_ADMIN_PHONE, "code": "000000" if code != "000000" else "111111", "new_password": "yangiParol123"},
    )
    assert bad.status_code == 400
    assert bad.json()["code"] == "validation_error"

    ok = client.post(
        "/api/auth/reset-password",
        json={"phone": TEST_ADMIN_PHONE, "code": code, "new_password": "yangiParol123"},
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["access_token"]

    # Kod bir martalik — qayta ishlatib bo'lmaydi.
    reuse = client.post(
        "/api/auth/reset-password",
        json={"phone": TEST_ADMIN_PHONE, "code": code, "new_password": "boshqaParol456"},
    )
    assert reuse.status_code == 400

    # Eski parol endi ishlamaydi, yangisi ishlaydi.
    old_login = client.post("/api/auth/login", json={"login": TEST_ADMIN_PHONE, "password": TEST_ADMIN_PASSWORD})
    assert old_login.status_code == 401

    new_login = client.post("/api/auth/login", json={"login": TEST_ADMIN_PHONE, "password": "yangiParol123"})
    assert new_login.status_code == 200, new_login.text


def test_forgot_password_unknown_phone_returns_generic_ok(client):
    """Enumeration himoyasi — mavjud bo'lmagan raqam ham 200 qaytaradi."""
    res = client.post("/api/auth/forgot-password", json={"phone": "+998911234567"})
    assert res.status_code == 200
    assert redis_client.get("pwreset:code:+998911234567") is None


def test_reset_password_max_attempts_invalidates_code(client):
    phone = "+998912345678"
    from app.services import password_reset

    password_reset.generate_and_send_code(phone)
    code = redis_client.get(f"pwreset:code:{phone}")
    assert code is not None

    for _ in range(5):
        client.post("/api/auth/reset-password", json={"phone": phone, "code": "wrong0", "new_password": "parol12345"})

    # 5-urinishdan keyin to'g'ri kod ham endi ishlamaydi (kod bekor qilindi).
    res = client.post("/api/auth/reset-password", json={"phone": phone, "code": code, "new_password": "parol12345"})
    assert res.status_code == 400
