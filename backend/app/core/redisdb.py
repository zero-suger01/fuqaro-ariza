"""Umumiy sinxron Redis klienti (ai-health, boshqa o'qish-yozishlar uchun).

ratelimit.py o'z klientini saqlab qoladi (tarixiy); yangi kod shu yerdan
foydalansin — bitta joyda konfiguratsiya.
"""
import redis

from app.config import get_settings

redis_client = redis.Redis.from_url(get_settings().redis_url, decode_responses=True)
