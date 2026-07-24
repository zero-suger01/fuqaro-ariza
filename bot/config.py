import os

from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
BOT_API_TOKEN = os.environ["BOT_API_TOKEN"]
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/1")
