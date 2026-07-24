from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
)

from i18n import LANGUAGE_NAMES, LANGUAGES, t

NEIGHBORHOODS_PER_PAGE = 8


def language_inline_keyboard() -> InlineKeyboardMarkup:
    rows = [
        [InlineKeyboardButton(text=LANGUAGE_NAMES[code], callback_data=f"lang:{code}")] for code in LANGUAGES
    ]
    return InlineKeyboardMarkup(inline_keyboard=rows)


def main_menu_keyboard(language: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=t(language, "menu_submit"))],
            [KeyboardButton(text=t(language, "menu_my"))],
            [KeyboardButton(text=t(language, "menu_help"))],
        ],
        resize_keyboard=True,
    )


def contact_keyboard(language: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=t(language, "share_contact_button"), request_contact=True)],
            [KeyboardButton(text=t(language, "cancel_button"))],
        ],
        resize_keyboard=True,
    )


def cancel_keyboard(language: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=t(language, "cancel_button"))]],
        resize_keyboard=True,
    )


def voice_confirm_keyboard(language: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=t(language, "yes")), KeyboardButton(text=t(language, "no"))],
            [KeyboardButton(text=t(language, "cancel_button"))],
        ],
        resize_keyboard=True,
    )


def photos_keyboard(language: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=t(language, "skip_button"))],
            [KeyboardButton(text=t(language, "back_button")), KeyboardButton(text=t(language, "cancel_button"))],
        ],
        resize_keyboard=True,
    )


def location_keyboard(language: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=t(language, "send_location_button"), request_location=True)],
            [KeyboardButton(text=t(language, "back_button")), KeyboardButton(text=t(language, "cancel_button"))],
        ],
        resize_keyboard=True,
    )


def neighborhood_inline_keyboard(neighborhoods: list[dict], page: int, language: str) -> InlineKeyboardMarkup:
    start = page * NEIGHBORHOODS_PER_PAGE
    page_items = neighborhoods[start : start + NEIGHBORHOODS_PER_PAGE]
    total_pages = max(1, (len(neighborhoods) + NEIGHBORHOODS_PER_PAGE - 1) // NEIGHBORHOODS_PER_PAGE)

    rows = [[InlineKeyboardButton(text=item["name"], callback_data=f"nb:{item['id']}")] for item in page_items]

    nav_row = []
    if page > 0:
        nav_row.append(InlineKeyboardButton(text="◀️", callback_data=f"nbpage:{page - 1}"))
    nav_row.append(
        InlineKeyboardButton(text=t(language, "neighborhood_page", current=page + 1, total=total_pages), callback_data="noop")
    )
    if page < total_pages - 1:
        nav_row.append(InlineKeyboardButton(text="▶️", callback_data=f"nbpage:{page + 1}"))
    rows.append(nav_row)

    return InlineKeyboardMarkup(inline_keyboard=rows)


def confirm_keyboard(language: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=t(language, "confirm_submit_button"))],
            [KeyboardButton(text=t(language, "back_button")), KeyboardButton(text=t(language, "cancel_button"))],
        ],
        resize_keyboard=True,
    )


def remove_keyboard() -> ReplyKeyboardRemove:
    return ReplyKeyboardRemove()
