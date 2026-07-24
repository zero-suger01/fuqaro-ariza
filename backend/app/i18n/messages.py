"""SMS shablonlari — 4 tilda (docs/03-kontraktlar.md §6, B4.1).

Xato javoblarining `detail` matni har bir endpointda to'g'ridan-to'g'ri
yoziladi (app/core/errors.py); bu yerda faqat tashqi kanal (SMS) matnlari.
"""
from app.config import get_settings

settings = get_settings()

_QABUL = {
    "uz": "Arizangiz qabul qilindi. Ariza raqami: {ticket}. Holatni {url}/holat sahifasida tekshirishingiz mumkin.",
    "oz": "Аризангиз қабул қилинди. Ариза рақами: {ticket}. Ҳолатни {url}/ҳолат саҳифасида текширишингиз мумкин.",
    "ru": "Ваше обращение принято. Номер обращения: {ticket}. Статус можно проверить на {url}/holat.",
    "en": "Your complaint has been received. Ticket number: {ticket}. Check status at {url}/holat.",
}

_REPLY = {
    "uz": "Arizangizga ({ticket}) rasmiy javob keldi. Batafsil: {url}/holat?ticket={ticket}",
    "oz": "Аризангизга ({ticket}) расмий жавоб келди. Батафсил: {url}/ҳолат?ticket={ticket}",
    "ru": "Получен официальный ответ по обращению {ticket}. Подробнее: {url}/holat?ticket={ticket}",
    "en": "An official reply has arrived for complaint {ticket}. Details: {url}/holat?ticket={ticket}",
}

# status -> 4 tilli matn. Faqat state-machine'da haqiqatan mavjud bo'lgan
# holatlar uchun (app/core/constants.py STATUS_TRANSITIONS).
_STATUS = {
    "ai_processed": {
        "uz": "Ariza {ticket} ko'rib chiqilmoqda.",
        "oz": "Ариза {ticket} кўриб чиқилмоқда.",
        "ru": "Обращение {ticket} рассматривается.",
        "en": "Complaint {ticket} is being reviewed.",
    },
    "assigned": {
        "uz": "Ariza {ticket} mas'ul bo'limga yo'naltirildi.",
        "oz": "Ариза {ticket} масъул бўлимга йўналтирилди.",
        "ru": "Обращение {ticket} направлено в ответственный отдел.",
        "en": "Complaint {ticket} has been forwarded to the responsible department.",
    },
    "accepted": {
        "uz": "Ariza {ticket} bo'lim tomonidan qabul qilindi.",
        "oz": "Ариза {ticket} бўлим томонидан қабул қилинди.",
        "ru": "Обращение {ticket} принято отделом в работу.",
        "en": "Complaint {ticket} has been accepted by the department.",
    },
    "in_progress": {
        "uz": "Ariza {ticket} ijroga qo'yildi.",
        "oz": "Ариза {ticket} ижрога қўйилди.",
        "ru": "Обращение {ticket} взято в исполнение.",
        "en": "Complaint {ticket} is now being worked on.",
    },
    "need_info": {
        "uz": "Ariza {ticket} bo'yicha qo'shimcha ma'lumot kerak. Batafsil: {url}/holat?ticket={ticket}",
        "oz": "Ариза {ticket} бўйича қўшимча маълумот керак. Батафсил: {url}/ҳолат?ticket={ticket}",
        "ru": "По обращению {ticket} требуется дополнительная информация. Подробнее: {url}/holat?ticket={ticket}",
        "en": "Additional information is needed for complaint {ticket}. Details: {url}/holat?ticket={ticket}",
    },
    "resolved": {
        "uz": "Ariza {ticket} hal qilindi.",
        "oz": "Ариза {ticket} ҳал қилинди.",
        "ru": "Обращение {ticket} решено.",
        "en": "Complaint {ticket} has been resolved.",
    },
    "rejected": {
        "uz": "Ariza {ticket} rad etildi.",
        "oz": "Ариза {ticket} рад этилди.",
        "ru": "Обращение {ticket} отклонено.",
        "en": "Complaint {ticket} has been rejected.",
    },
    "closed": {
        "uz": "Ariza {ticket} yopildi.",
        "oz": "Ариза {ticket} ёпилди.",
        "ru": "Обращение {ticket} закрыто.",
        "en": "Complaint {ticket} has been closed.",
    },
}


def _render(templates: dict[str, str], language: str, **kwargs) -> str:
    lang = language if language in templates else "uz"
    return templates[lang].format(url=settings.public_base_url, **kwargs)


def qabul_text(language: str, ticket: str) -> str:
    return _render(_QABUL, language, ticket=ticket)


def reply_text(language: str, ticket: str) -> str:
    return _render(_REPLY, language, ticket=ticket)


def status_text(status: str, language: str, ticket: str) -> str | None:
    templates = _STATUS.get(status)
    if templates is None:
        return None
    return _render(templates, language, ticket=ticket)
