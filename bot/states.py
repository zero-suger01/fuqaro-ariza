from aiogram.fsm.state import State, StatesGroup


class Onboarding(StatesGroup):
    choosing_language = State()
    waiting_contact = State()


class ComplaintForm(StatesGroup):
    description = State()
    confirm_voice = State()
    photos = State()
    neighborhood = State()
    location = State()
    confirm = State()
