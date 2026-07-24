"""Canonical enum values — must mirror docs/03-kontraktlar.md §2 EXACTLY.

Values live as plain strings in the DB (varchar, not native Postgres ENUM) so
new codes can be added without a migration. This module is the single place
that encodes the contract's allowed values and transitions.
"""

# 2.1 ComplaintStatus
STATUS_NEW = "new"
STATUS_AI_PROCESSED = "ai_processed"
STATUS_ASSIGNED = "assigned"
STATUS_ACCEPTED = "accepted"
STATUS_IN_PROGRESS = "in_progress"
STATUS_NEED_INFO = "need_info"
STATUS_RESOLVED = "resolved"
STATUS_REJECTED = "rejected"
STATUS_CLOSED = "closed"
STATUS_ARCHIVED = "archived"

COMPLAINT_STATUSES = [
    STATUS_NEW,
    STATUS_AI_PROCESSED,
    STATUS_ASSIGNED,
    STATUS_ACCEPTED,
    STATUS_IN_PROGRESS,
    STATUS_NEED_INFO,
    STATUS_RESOLVED,
    STATUS_REJECTED,
    STATUS_CLOSED,
    STATUS_ARCHIVED,
]

# Allowed transitions ([03] §2.1). need_info can be entered from
# assigned/accepted/in_progress and always returns to in_progress.
STATUS_TRANSITIONS: dict[str, set[str]] = {
    STATUS_NEW: {STATUS_AI_PROCESSED, STATUS_REJECTED},
    STATUS_AI_PROCESSED: {STATUS_ASSIGNED, STATUS_REJECTED},
    STATUS_ASSIGNED: {STATUS_ACCEPTED, STATUS_IN_PROGRESS, STATUS_NEED_INFO, STATUS_REJECTED},
    STATUS_ACCEPTED: {STATUS_IN_PROGRESS, STATUS_NEED_INFO},
    STATUS_IN_PROGRESS: {STATUS_NEED_INFO, STATUS_RESOLVED},
    STATUS_NEED_INFO: {STATUS_IN_PROGRESS},
    STATUS_RESOLVED: {STATUS_CLOSED},
    STATUS_REJECTED: set(),
    STATUS_CLOSED: {STATUS_ARCHIVED},
    STATUS_ARCHIVED: set(),
}

# Holatlar bu yerga yetgach murojaat endi "overdue"/eskalatsiya kandidati
# emas (docs/05-backend-tasklar.md B4.5, dashboard overdue hisobi).
TERMINAL_STATUSES = [STATUS_RESOLVED, STATUS_CLOSED, STATUS_REJECTED, STATUS_ARCHIVED]

# 2.2 status_simple
STATUS_SIMPLE_MAP: dict[str, str] = {
    STATUS_NEW: "qabul_qilindi",
    STATUS_AI_PROCESSED: "qabul_qilindi",
    STATUS_ASSIGNED: "korilmoqda",
    STATUS_ACCEPTED: "korilmoqda",
    STATUS_IN_PROGRESS: "ijroda",
    STATUS_NEED_INFO: "ijroda",
    STATUS_RESOLVED: "yakunlandi",
    STATUS_CLOSED: "yakunlandi",
    STATUS_ARCHIVED: "yakunlandi",
    STATUS_REJECTED: "rad_etildi",
}

STATUS_SIMPLE_STEPS = ["qabul_qilindi", "korilmoqda", "ijroda", "yakunlandi"]

# 2.3 boshqa enumlar
PRIORITIES = ["low", "medium", "high", "critical"]
SENTIMENTS = ["negative", "neutral", "positive"]
SOURCES = ["web", "telegram", "qr", "operator"]
FILE_KINDS = ["image", "video", "audio", "document"]
STAFF_ROLES = ["department_staff", "admin"]
AI_ENGINES = ["keyword", "llm"]
NOTIFICATION_CHANNELS = ["in_app", "sms", "telegram", "email"]
KEYWORD_SOURCES = ["seed", "admin", "auto"]
LANGUAGES = ["uz", "oz", "ru", "en"]

CATEGORY_CODES = [
    "chiqindi", "yol", "transport", "elektr", "gaz", "suv", "kommunal",
    "daraxt", "ekologiya", "qurilish", "obodonlashtirish", "kadastr",
    "soliq", "ijtimoiy", "boshqa",
]
DEFAULT_CATEGORY_CODE = "boshqa"

# 2.4 fayl limitlari
FILE_LIMITS = {
    "image": {"max_size_mb": 10, "max_count": 5, "mimes": ["image/jpeg", "image/png", "image/webp", "image/heic"]},
    "video": {"max_size_mb": 50, "max_count": 1, "mimes": ["video/mp4", "video/quicktime"]},
    # audio/x-wav: some libmagic builds report legacy WAV as x-wav rather than
    # the contract's "audio/wav" — same format, kept as a compatibility alias.
    "audio": {"max_size_mb": 10, "max_duration_s": 120, "max_count": 1, "mimes": ["audio/ogg", "audio/webm", "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav"]},
}

# §8 complaint_events.event_type
EVENT_TYPES = [
    "created", "ai_processed", "status_changed", "assigned", "comment_added",
    "reply_sent", "info_requested", "sms_sent", "telegram_sent", "escalated",
    "sla_warning", "reviewed",
]
ACTOR_TYPES = ["citizen", "staff", "system", "ai"]
