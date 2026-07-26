from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Ariza API"
    environment: str = "development"

    database_url: str = "postgresql+psycopg://ariza:ariza@localhost:5433/ariza"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    ticket_prefix: str = "UY"

    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "ariza"
    s3_secret_key: str = "ariza12345"
    s3_bucket: str = "ariza-complaints"
    s3_region: str = "us-east-1"
    s3_public_base_url: str = "http://localhost:9000/ariza-complaints"

    cors_origins: list[str] = ["http://localhost:3000"]

    smtp_host: str | None = None
    smtp_port: int = 587

    # AI (docs/07-ai-layer.md) — LLM yagona dvigatel (v1.3)
    # v1.5.1 (vaqtincha, lokal): "ollama" | "deepseek". Ikkalasi ham xuddi
    # shu LlmAnalysis sxemasini qaytaradi — worker/pipeline o'zgarmaydi,
    # faqat app/services/ai/llm.py ichida qaysi API chaqirilishi almashadi.
    llm_provider: str = "ollama"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "gemma3:12b"
    # DeepSeek (OpenAI-compatible chat completions). Lokal Ollama o'rniga
    # vaqtincha ishlatilganda LLM_PROVIDER=deepseek + shu kalit kerak.
    deepseek_api_key: str | None = None
    deepseek_model: str = "deepseek-chat"
    deepseek_base_url: str = "https://api.deepseek.com"
    # LLM shundan past ishonch bersa `needs_review` BELGISI qo'yiladi
    # (bloklamaydi — murojaat baribir yo'naltiriladi, docs/07 §1).
    ai_low_confidence: float = 0.6
    # R1: generatsiya (xulosa + javob drafti + teglar) klassifikatsiyadan
    # ancha ko'p token talab qiladi — CPU serverda 2-6 daqiqa. Fuqaro ham,
    # xodim ham kutmaydi (async worker), shuning uchun timeout saxiy.
    # O'lchangan qiymatlar: docs/07-ai-layer.md §4 model jadvali.
    llm_timeout_s: float = 300.0
    llm_max_attempts: int = 2

    # STT
    stt_provider: str = "whisper"
    stt_whisper_model: str = "medium"
    mohirai_api_key: str | None = None

    # Notifications
    eskiz_email: str | None = None
    eskiz_password: str | None = None
    telegram_bot_token: str | None = None
    bot_api_token: str | None = None

    public_base_url: str = "http://localhost:3000"

    # B4.7 — CAPTCHA. Unset secret = disabled (no Cloudflare keys yet, no
    # frontend widget wired up either — see docs/05-backend-tasklar.md B4.7).
    turnstile_secret_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
