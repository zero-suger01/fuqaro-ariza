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

    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "ariza"
    s3_secret_key: str = "ariza12345"
    s3_bucket: str = "ariza-complaints"
    s3_region: str = "us-east-1"
    s3_public_base_url: str = "http://localhost:9000/ariza-complaints"

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
    ]

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
    #
    # 0.6 -> 0.9 (v1.8). Sabab: 0.6 da bu shart HECH QACHON ishlamagan —
    # 35 ta tahlildan bittasi ham 0.6 dan past emas. LLM o'zi haqidagi
    # ishonchni deyarli har doim yuqori beradi (bu modelning ma'lum
    # xususiyati, loyihaning xatosi emas), shuning uchun 0.6 amalda o'lik
    # kod edi.
    #
    # DIQQAT — bu qiymat MODELGA sozlangan, universal emas.
    # deepseek-v4-flash o'lchovi (n=20): 0.60×1, 0.92×1, 0.95×16, 1.00×2.
    # Chegara pichoq tig'ida turadi:
    #     < 0.90 ->  5%   < 0.95 -> 10%   < 0.96 -> 90%
    # 0.96 ga ko'tarish navbatni bosib ketadi (qiymatlarning 80% i aynan
    # 0.95). 0.9 tanlandi: haqiqiy chetdagilarni (0.60) ushlaydi, asosiy
    # to'plamdan xavfsiz uzoqda va tig'da emas.
    #
    # Model almashtirilsa QAYTA o'lchash shart (docs/07 §5):
    #   SELECT confidence, count(*) FROM ai_analyses
    #   WHERE model='<yangi model>' GROUP BY 1 ORDER BY 1;
    #
    # Bu chegara — zaxira to'r, asosiy sifat signali EMAS. Ishonchli
    # signallar: `ai_routing_corrected_7d` (xodim qayta yo'naltirgani) va
    # ko'p bo'limli murojaat aniqlanishi (v1.5 sub-tasklar).
    ai_low_confidence: float = 0.9
    # R1: generatsiya (xulosa + javob drafti + teglar) klassifikatsiyadan
    # ancha ko'p token talab qiladi — CPU serverda 2-6 daqiqa. Fuqaro ham,
    # xodim ham kutmaydi (async worker), shuning uchun timeout saxiy.
    # O'lchangan qiymatlar: docs/07-ai-layer.md §4 model jadvali.
    llm_timeout_s: float = 300.0
    llm_max_attempts: int = 2

    # STT — "gigaam" (lokal, standart) yoki "mohirai" (API, hali ulanmagan)
    stt_provider: str = "gigaam"
    mohirai_api_key: str | None = None
    # GigaAM Multilingual int8 ONNX (voice/ sibling project) — dir containing
    # manifest.json + the int8 .onnx file. Used when stt_provider="gigaam".
    gigaam_model_dir: str | None = None

    # Notifications
    eskiz_email: str | None = None
    eskiz_password: str | None = None
    telegram_bot_token: str | None = None
    telegram_bot_username: str | None = None
    bot_api_token: str | None = None

    public_base_url: str = "http://localhost:3000"
    public_support_phone: str = "71 000 00 00"

    # B4.7 — CAPTCHA. Unset secret = disabled (no Cloudflare keys yet, no
    # frontend widget wired up either — see docs/05-backend-tasklar.md B4.7).
    turnstile_secret_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
