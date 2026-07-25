from aiogram.fsm.state import State, StatesGroup


class Onboarding(StatesGroup):
    choosing_language = State()
    waiting_contact = State()


class InfoReply(StatesGroup):
    """v1.4 — `need_info` javobi va e'tiroz izohi (docs/08 T2.2–T2.3).

    Ikkalasi ham bitta narsani kutadi: erkin matn. Farqi `state` ichida
    saqlanadigan `ticket` va qaysi endpointga ketishida.
    """

    waiting_info = State()
    waiting_feedback_comment = State()


class ComplaintForm(StatesGroup):
    description = State()
    confirm_voice = State()
    photos = State()
    neighborhood = State()
    location = State()
    confirm = State()
