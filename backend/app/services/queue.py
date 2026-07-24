"""Bridges the sync request handlers (FastAPI `def`, not `async def`) to
arq's async Redis pool so a job can be enqueued without waiting for it."""
import asyncio

from arq import create_pool
from arq.connections import RedisSettings

from app.config import get_settings

settings = get_settings()


def enqueue(job_name: str, *args) -> None:
    async def _enqueue() -> None:
        pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
        try:
            await pool.enqueue_job(job_name, *args)
        finally:
            await pool.aclose()

    asyncio.run(_enqueue())
