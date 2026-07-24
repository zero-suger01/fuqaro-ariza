import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.types import BotCommand, ErrorEvent

import storage
from config import REDIS_URL, TELEGRAM_BOT_TOKEN
from handlers import complaint, start, status
from i18n import t

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_COMMANDS = {
    "uz": [BotCommand(command="start", description="Botni qayta boshlash"), BotCommand(command="help", description="Yordam")],
    "oz": [BotCommand(command="start", description="Ботни қайта бошлаш"), BotCommand(command="help", description="Ёрдам")],
    "ru": [BotCommand(command="start", description="Начать заново"), BotCommand(command="help", description="Помощь")],
    "en": [BotCommand(command="start", description="Restart the bot"), BotCommand(command="help", description="Help")],
}


async def _set_commands(bot: Bot) -> None:
    await bot.set_my_commands(_COMMANDS["uz"])
    for lang, commands in _COMMANDS.items():
        await bot.set_my_commands(commands, language_code=lang if lang != "uz" else None)


def _extract_chat_id(event: ErrorEvent) -> int | None:
    update = event.update
    if update.message:
        return update.message.chat.id
    if update.callback_query and update.callback_query.message:
        return update.callback_query.message.chat.id
    return None


async def main() -> None:
    bot = Bot(token=TELEGRAM_BOT_TOKEN, default=DefaultBotProperties(parse_mode=None))
    dispatcher = Dispatcher(storage=RedisStorage.from_url(REDIS_URL))

    dispatcher.include_router(start.router)
    dispatcher.include_router(complaint.router)
    dispatcher.include_router(status.router)

    @dispatcher.errors()
    async def on_error(event: ErrorEvent) -> bool:
        logger.exception("Kutilmagan xato yangilanishni qayta ishlashda", exc_info=event.exception)
        chat_id = _extract_chat_id(event)
        if chat_id is not None:
            profile = await storage.get_profile(chat_id)
            language = profile["language"] if profile else "uz"
            try:
                await bot.send_message(chat_id, t(language, "error_generic"))
            except Exception:
                logger.exception("Xato xabarini yuborib bo'lmadi")
        return True

    await _set_commands(bot)

    logger.info("Bot polling boshlandi")
    await dispatcher.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
