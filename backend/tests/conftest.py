"""Test infratuzilmasi — ALOHIDA bazada (docs/11-devops.md §1.1).

Avval testlar `DATABASE_URL` ni, ya'ni **jonli development bazasini**
ishlatardi: har `pytest` yugurishi dev bazaga real fuqaro, murojaat,
bildirishnoma va MinIO fayllari yozib qoldirardi, tozalash esa yo'q edi.
Natijada dev ma'lumoti test chiqindisi bilan aralashib ketardi va
testlar seed'dagi aniq bir admin hisobiga bog'lanib qolgan edi.

Endi:

1. `TEST_DATABASE_URL` (standart `..._test` bazasi) ishlatiladi. U
   `DATABASE_URL` bilan bir xil bo'lsa to'plam **ishga tushmaydi** — bu
   ataylab, tasodifan dev bazani tozalab yuborishning oldini oladi.
2. Baza yo'q bo'lsa yaratiladi, `alembic upgrade head` + seed yuriladi.
3. Har test **savepoint** ichida bajarilib, oxirida rollback qilinadi —
   `create_complaint` kabi ichida `commit()` chaqiradigan kod ham
   izolyatsiyani buzmaydi (`join_transaction_mode="create_savepoint"`).
4. Rate-limit kalitlari test prefiksida — dev Redis'idagi hisoblagichlar
   testga ta'sir qilmaydi va test ular tozalanishiga sabab bo'lmaydi.
"""
import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

BACKEND_DIR = Path(__file__).resolve().parent.parent

DEFAULT_TEST_DATABASE_URL = "postgresql+psycopg://ariza:ariza@localhost:5433/ariza_test"

# Seed admin — testlar shu hisob bilan kiradi. Qiymatlar FAQAT test
# bazasida yashaydi ([04] §5: production'da env orqali beriladi).
TEST_ADMIN_PHONE = "+998900000000"
TEST_ADMIN_PASSWORD = "test-admin-12345"


def _test_database_url() -> str:
    url = os.getenv("TEST_DATABASE_URL") or DEFAULT_TEST_DATABASE_URL
    from app.config import get_settings

    if url == get_settings().database_url:
        pytest.exit(
            "TEST_DATABASE_URL va DATABASE_URL bir xil — testlar development bazasini "
            "tozalab yuborardi. Alohida baza ko'rsating (masalan .../ariza_test).",
            returncode=2,
        )
    return url


def _ensure_database(url: str) -> None:
    """Baza yo'q bo'lsa yaratadi (CREATE DATABASE tranzaksiyadan tashqarida)."""
    parts = urlsplit(url)
    db_name = parts.path.lstrip("/")
    admin_url = urlunsplit(parts._replace(path="/postgres"))

    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    try:
        with admin_engine.connect() as conn:
            exists = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": db_name}
            ).scalar()
            if not exists:
                conn.execute(text(f'CREATE DATABASE "{db_name}"'))
    finally:
        admin_engine.dispose()


def _migrate_and_seed(url: str) -> None:
    """Alembic va seed'ni ALOHIDA protsessda yuritadi.

    Sabab: `app.config.get_settings()` `lru_cache` bilan keshlangan va
    `app.database.engine` modul yuklanishida yaratiladi — bitta protsess
    ichida ularni test bazasiga qayta yo'naltirish mo'rt bo'lardi.
    Subprocess'da `DATABASE_URL` env'i pydantic-settings uchun `.env`
    faylidan ustun turadi, shuning uchun ikkisi ham to'g'ri bazaga
    tushadi.
    """
    env = {
        **os.environ,
        "DATABASE_URL": url,
        "ADMIN_SEED_PHONE": TEST_ADMIN_PHONE,
        "ADMIN_SEED_PASSWORD": TEST_ADMIN_PASSWORD,
    }
    for args in (["alembic", "upgrade", "head"], [sys.executable, "-m", "app.seed", "--demo"]):
        result = subprocess.run(args, cwd=BACKEND_DIR, env=env, capture_output=True, text=True)
        if result.returncode != 0:
            pytest.exit(f"{' '.join(args)} muvaffaqiyatsiz:\n{result.stdout}\n{result.stderr}", returncode=2)


@pytest.fixture(scope="session")
def test_database_url() -> str:
    url = _test_database_url()
    _ensure_database(url)
    _migrate_and_seed(url)
    return url


@pytest.fixture(scope="session")
def test_engine(test_database_url: str):
    engine = create_engine(test_database_url, pool_pre_ping=True)

    # Audit middleware `Depends(get_db)` dan foydalana olmaydi va o'z
    # sessiyasini ochadi — u ham test bazasiga qaratilishi kerak, aks
    # holda har admin mutatsiyasi dev bazaga yozishga urinib FK xatosi
    # beradi (`app/core/audit.py` session_factory izohi).
    from sqlalchemy.orm import sessionmaker

    from app.core import audit

    original_factory = audit.session_factory
    audit.session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    yield engine
    audit.session_factory = original_factory
    engine.dispose()


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """Rate limitlar (B4.3) IP bo'yicha hisoblanadi, testlar esa doim
    bitta IP'dan (`testclient`) keladi: submit 5/soat/telefon +
    **20/kun/IP**, track 30/soat/IP, info 10/soat/IP.

    Shuning uchun tozalash HAR TEST oldidan bajariladi. Sessiya boshida
    bir marta tozalash yetmaydi: to'plamda 20 dan ko'p murojaat
    yuboriladi va o'rtada testlar 429 bilan yiqilib, «kod buzilgan»
    degan yolg'on signal berardi. Faqat `rl:*` kalitlari o'chiriladi —
    boshqa Redis ma'lumotlariga tegilmaydi.
    """
    from app.core.redisdb import redis_client

    def purge():
        for pattern in ("rl:submit:*", "rl:track:*", "rl:stt:*", "rl:info:*", "rl:pwreset:*", "pwreset:*"):
            keys = list(redis_client.scan_iter(match=pattern, count=500))
            if keys:
                redis_client.delete(*keys)

    purge()
    yield
    purge()


@pytest.fixture
def db_session(test_engine):
    """Har test uchun izolyatsiyalangan sessiya.

    Tashqi tranzaksiya ochiladi, sessiya esa unga savepoint rejimida
    ulanadi: ilova kodidagi `db.commit()` savepoint'ni yopadi, lekin
    tashqi tranzaksiya ochiq qoladi va test oxirida hammasi rollback
    bo'ladi. Shu sabab testlar bir-biriga ta'sir qilmaydi va bazada
    chiqindi qolmaydi.
    """
    connection = test_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session):
    from app.database import get_db
    from app.main import app

    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def admin_headers(client) -> dict[str, str]:
    response = client.post(
        "/api/auth/login", json={"login": TEST_ADMIN_PHONE, "password": TEST_ADMIN_PASSWORD}
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def staff_headers(client) -> dict[str, str]:
    """`--demo` seed'idagi Sanitariya bo'limi xodimi — RBAC va egalik
    testlari uchun (admin emas, bitta bo'limga bog'langan)."""
    from app.seed import DEMO_PASSWORD, DEMO_STAFF

    _, phone, _, _ = DEMO_STAFF[0]
    response = client.post("/api/auth/login", json={"login": phone, "password": DEMO_PASSWORD})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
