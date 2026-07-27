"""Canonical enum values — must mirror docs/03-kontraktlar.md §2 EXACTLY.

Values live as plain strings in the DB (varchar, not native Postgres ENUM).
This module is the single place that encodes the contract's allowed values
and transitions.

NOTE: yangi **status** qo'shish uchun migratsiya baribir kerak —
`m5_indexes_checks.py` dagi `ck_complaints_status` CHECK 10 qiymatni
sanaydi. Migratsiyasiz qo'shsa bo'ladigan narsa — yangi **o'tish**
(`STATUS_TRANSITIONS`), yangi event turi va boshqa ilova darajasidagi
enumlar.
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
    # accepted'dan ham rejected mumkin — qabul qilgan xodim ishni ko'rib
    # chiqib rad etishi mumkin (docs/03 §2.1).
    STATUS_ACCEPTED: {STATUS_IN_PROGRESS, STATUS_NEED_INFO, STATUS_REJECTED},
    STATUS_IN_PROGRESS: {STATUS_NEED_INFO, STATUS_RESOLVED},
    STATUS_NEED_INFO: {STATUS_IN_PROGRESS},
    # v1.4: resolved/closed'dan in_progress'ga qaytish — FAQAT fuqaro
    # e'tirozi bilan (CITIZEN_ONLY_TRANSITIONS, pastga qarang).
    STATUS_RESOLVED: {STATUS_CLOSED, STATUS_IN_PROGRESS},
    STATUS_REJECTED: set(),
    STATUS_CLOSED: {STATUS_ARCHIVED, STATUS_IN_PROGRESS},
    STATUS_ARCHIVED: set(),
}

# v1.4 — bu o'tishlarni FAQAT fuqaro boshlashi mumkin (`actor_type="citizen"`,
# [03] §3.6 feedback). Xodim yopilgan murojaatni o'zicha qayta ocha olmaydi:
# aks holda «hal qilindi» ko'rsatkichini qo'lda tuzatish yo'li ochilib
# qolardi. Xodim uchun yagona yo'l — fuqaro e'tiroz bildirishi.
CITIZEN_ONLY_TRANSITIONS: set[tuple[str, str]] = {
    (STATUS_RESOLVED, STATUS_IN_PROGRESS),
    (STATUS_CLOSED, STATUS_IN_PROGRESS),
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
AI_ENGINES = ["llm"]  # v1.3: keyword dvigateli olib tashlandi ([03] §2.3)
NOTIFICATION_CHANNELS = ["in_app", "sms", "telegram", "email"]
LANGUAGES = ["uz", "oz", "ru", "en"]

# v1.4 — fuqaro qo'shimcha ma'lumotni qaysi kanaldan yubordi ([04] citizen_messages).
# web/telegram statusni avtomatik `in_progress` ga qaytaradi, manual — yo'q.
CITIZEN_INFO_SOURCES = ["web", "telegram", "manual"]
AUTO_RESUME_INFO_SOURCES = {"web", "telegram"}

# v1.4 — AI nazoratida tuzatish sababi ([03] §5 review).
REVIEW_REASONS = ["ok", "wrong_category", "wrong_department", "wrong_priority", "other"]

SUBTASK_STATUSES = ["open", "done", "cancelled"]

# v1.8 — hokimlik matritsasi bo'yicha (docs/14). Kategoriya = mas'ul
# tashkilot (1:1), shuning uchun ro'yxat `seed.py: CATEGORIES` bilan bir xil
# tartibda yuriladi. Nofaol qilingan eski kodlar `seed.py:
# RETIRED_CATEGORIES` da — ular bazada qoladi (mavjud murojaatlar FK'si),
# lekin bu ro'yxatda yo'q.
CATEGORY_CODES = [
    "elektr", "gaz", "suv_kanalizatsiya", "obodonlashtirish", "chiqindi", "uy_joy",
    "yol", "yol_harakati", "jamoat_transporti",
    "ekologiya", "yer_kadastr", "qurilish",
    "sogliqni_saqlash", "talim", "ijtimoiy_yordam",
    "jamoat_xavfsizlik", "favqulodda", "ijro", "fhdyo_hujjatlar",
    "soliq", "mehnat", "isteomolchi",
    "hokimlik", "mahalla",
]
# Matritsa §7: «Yuqoridagi hech qaysi tashkilotga aniq tushmaydigan kompleks
# muammolar» -> Tuman hokimligi. Avval bu `boshqa` edi; u nomi bo'yicha
# «bilmadim» degan qutiga o'xshardi va hech kimga biriktirilmagandek
# tuyulardi, aslida esa mas'ul aniq — hokimlik.
DEFAULT_CATEGORY_CODE = "hokimlik"

# 2.4 fayl limitlari
FILE_LIMITS = {
    "image": {"max_size_mb": 10, "max_count": 5, "mimes": ["image/jpeg", "image/png", "image/webp", "image/heic"]},
    "video": {"max_size_mb": 50, "max_count": 1, "mimes": ["video/mp4", "video/quicktime"]},
    # audio/x-wav: some libmagic builds report legacy WAV as x-wav rather than
    # the contract's "audio/wav" — same format, kept as a compatibility alias.
    # video/webm: libmagic can't tell an audio-only WebM (e.g. MediaRecorder's
    # "audio/webm;codecs=opus" output) from a video one by magic bytes alone —
    # both are Matroska containers — so it always reports "video/webm".
    "audio": {"max_size_mb": 10, "max_duration_s": 120, "max_count": 1, "mimes": ["audio/ogg", "audio/webm", "video/webm", "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav"]},
}

# §8 complaint_events.event_type
EVENT_TYPES = [
    "created", "ai_processed", "status_changed", "assigned", "comment_added",
    "reply_sent", "info_requested", "sms_sent", "telegram_sent", "escalated",
    "sla_warning", "reviewed",
    # v1.4 ([03] §8)
    "info_provided", "claimed", "reopened", "feedback_received",
    "subtask_created", "subtask_closed",
    # v1.8 — AI topgan, lekin chegara (MAX_AI_SUBTASKS) tufayli avtomatik
    # ajratilMAGAN xizmatlar. Payload: created, limit, not_assigned[].
    "subtasks_truncated",
]
ACTOR_TYPES = ["citizen", "staff", "system", "ai"]
