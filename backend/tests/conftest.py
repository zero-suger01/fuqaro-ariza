import pytest
from fastapi.testclient import TestClient

from app.core.redisdb import redis_client
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def _reset_rate_limits():
    """Smoke to'plami takroriy yuritilishi SHART (har commit oldidan).

    Rate limitlar (B4.3) IP bo'yicha hisoblanadi va testlar doim bitta
    IP'dan keladi: submit 5/soat/telefon + 20/kun/IP, track 30/soat/IP.
    Bir necha marta yurgizilganda to'plam 429 bilan yiqilardi — bu kod
    xatosi emas, lekin testni ishonchsiz qiladi. Shuning uchun sessiya
    boshida FAQAT rate-limit kalitlari tozalanadi (boshqa Redis
    ma'lumotlariga tegilmaydi).
    """
    for pattern in ("rl:submit:*", "rl:track:*", "rl:stt:*"):
        keys = list(redis_client.scan_iter(match=pattern, count=500))
        if keys:
            redis_client.delete(*keys)
    yield


@pytest.fixture(scope="session")
def client():
    return TestClient(app)
