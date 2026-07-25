"""Backend HTTP klienti — docs/03-kontraktlar.md §3 (public) va §6 (bot).
Bot DB'ga to'g'ridan-to'g'ri kirmaydi, FAQAT shu klient orqali ishlaydi.
"""
import httpx

from config import BACKEND_URL, BOT_API_TOKEN

_BOT_HEADERS = {"X-Bot-Token": BOT_API_TOKEN}


class ApiError(Exception):
    def __init__(self, status_code: int, code: str, detail: str):
        self.status_code = status_code
        self.code = code
        self.detail = detail
        super().__init__(f"{status_code} {code}: {detail}")


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=BACKEND_URL, timeout=30)


def _raise_for_status(resp: httpx.Response) -> None:
    if resp.status_code >= 400:
        try:
            body = resp.json()
        except ValueError:
            body = {}
        raise ApiError(resp.status_code, body.get("code", "server_error"), body.get("detail", resp.text))


async def link_citizen(*, phone: str, telegram_chat_id: int, first_name: str, language: str) -> dict:
    async with _client() as client:
        resp = await client.post(
            "/api/bot/citizens/link",
            headers=_BOT_HEADERS,
            json={
                "phone": phone,
                "telegram_chat_id": telegram_chat_id,
                "first_name": first_name,
                "language": language,
            },
        )
        _raise_for_status(resp)
        return resp.json()


async def submit_complaint(
    *,
    description: str,
    first_name: str,
    phone: str,
    language: str,
    telegram_chat_id: int,
    neighborhood_id: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    images: list[tuple[str, bytes, str]] | None = None,
) -> dict:
    data = {
        "description": description,
        "first_name": first_name,
        "phone": phone,
        "language": language,
        "telegram_chat_id": str(telegram_chat_id),
    }
    if neighborhood_id:
        data["neighborhood_id"] = neighborhood_id
    if latitude is not None:
        data["latitude"] = str(latitude)
    if longitude is not None:
        data["longitude"] = str(longitude)

    files = [("images", (name, content, mime)) for name, content, mime in (images or [])]

    async with _client() as client:
        resp = await client.post(
            "/api/bot/complaints",
            headers=_BOT_HEADERS,
            data=data,
            files=files or None,
        )
        _raise_for_status(resp)
        return resp.json()


async def list_complaints(telegram_chat_id: int) -> list[dict]:
    async with _client() as client:
        resp = await client.get(
            "/api/bot/complaints", headers=_BOT_HEADERS, params={"telegram_chat_id": telegram_chat_id}
        )
        _raise_for_status(resp)
        return resp.json()


async def submit_info(*, telegram_chat_id: int, ticket: str, text: str) -> dict:
    """`need_info` javobi ([03] §6, docs/08 T2.2).

    Web varianti (§3.5) bilan bir xil backend yadrosiga tushadi — murojaat
    `need_info` da bo'lsa avtomatik `in_progress` ga qaytadi.
    """
    async with _client() as client:
        resp = await client.post(
            "/api/bot/complaints/info",
            headers=_BOT_HEADERS,
            json={"telegram_chat_id": telegram_chat_id, "ticket": ticket, "text": text},
        )
        _raise_for_status(resp)
        return resp.json()


async def submit_feedback(
    *, telegram_chat_id: int, ticket: str, satisfied: bool, comment: str | None = None
) -> dict:
    """«Hal bo'ldimi? Ha/Yo'q» ([03] §3.6/§6, docs/08 T2.3)."""
    async with _client() as client:
        resp = await client.post(
            "/api/bot/complaints/feedback",
            headers=_BOT_HEADERS,
            json={
                "telegram_chat_id": telegram_chat_id,
                "ticket": ticket,
                "satisfied": satisfied,
                "comment": comment,
            },
        )
        _raise_for_status(resp)
        return resp.json()


async def get_neighborhoods() -> list[dict]:
    async with _client() as client:
        resp = await client.get("/api/public/neighborhoods")
        _raise_for_status(resp)
        return resp.json()


async def get_qr(code: str) -> dict | None:
    async with _client() as client:
        resp = await client.get(f"/api/public/qr/{code}")
        if resp.status_code == 404:
            return None
        _raise_for_status(resp)
        return resp.json()


async def stt_submit(*, audio: bytes, filename: str, mime: str, language: str) -> str:
    async with _client() as client:
        resp = await client.post(
            "/api/public/stt",
            data={"language": language},
            files={"audio": (filename, audio, mime)},
        )
        _raise_for_status(resp)
        return resp.json()["job_id"]


async def stt_status(job_id: str) -> dict:
    async with _client() as client:
        resp = await client.get(f"/api/public/stt/{job_id}")
        _raise_for_status(resp)
        return resp.json()
