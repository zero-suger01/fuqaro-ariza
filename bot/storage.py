"""Fuqaro profili (til, telefon, ism) — FSM holatidan alohida, doimiy
saqlanadi (murojaat FSM'i `state.clear()` qilinganda ham yo'qolmasin).
"""
import json

import redis.asyncio as redis

from config import REDIS_URL

_redis = redis.from_url(REDIS_URL, decode_responses=True)


def _key(chat_id: int) -> str:
    return f"bot:profile:{chat_id}"


async def get_profile(chat_id: int) -> dict | None:
    raw = await _redis.get(_key(chat_id))
    return json.loads(raw) if raw else None


async def save_profile(chat_id: int, **fields) -> dict:
    profile = await get_profile(chat_id) or {}
    profile.update(fields)
    await _redis.set(_key(chat_id), json.dumps(profile))
    return profile
