"""EXIF/metadata strip for uploaded photos (B4.4). Telefon kameralari EXIF
ichiga GPS koordinatasi, qurilma modeli va h.k.ni yozib qo'yadi — fuqaro
faqat xaritadan o'zi tanlagan joylashuvni bermoqchi, telefondagi aniq GPS
koordinatasini emas. Shu sabab har bir rasm saqlanishdan oldin qayta
kodlanadi.

`ImageOps.exif_transpose` orientatsiya tegini piksellarga jismonan
singdiradi (aks holda strip qilingandan keyin rasm burilib qolishi
mumkin); qolgan hamma metadata (GPS, qurilma nomi va h.k.) shunchaki qayta
saqlashda tashlab yuboriladi — PIL `exif=` argumenti berilmasa uni
ko'chirmaydi.
"""
import io
import logging

import pillow_heif
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

pillow_heif.register_heif_opener()

_SAVE_FORMAT = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
    "image/heic": "HEIF",
}


def strip_exif(data: bytes, mime: str) -> bytes:
    """Best-effort: har qanday xato bo'lsa original baytlar qaytariladi —
    metadata tozalanmasligi ariza yuborilishini bloklamasligi kerak."""
    fmt = _SAVE_FORMAT.get(mime)
    if fmt is None:
        return data
    try:
        image = Image.open(io.BytesIO(data))
        image = ImageOps.exif_transpose(image)
        if fmt == "JPEG" and image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        buf = io.BytesIO()
        image.save(buf, format=fmt)
        return buf.getvalue()
    except Exception as exc:  # noqa: BLE001 - fail-open, ariza yuborilishini to'xtatmaydi
        logger.warning("EXIF strip muvaffaqiyatsiz bo'ldi (%s): %s", mime, exc)
        return data
