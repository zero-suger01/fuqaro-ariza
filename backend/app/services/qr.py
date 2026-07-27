"""QR CRUD (B5.4): QR PNG + A4 plakat PDF generatsiyasi.

Plakat spec: docs/10-ui-ux.md §7 — sarlavha, ulkan QR, 3 qadam, ishonch
telefoni, matn lotin+kirill aralash (qishloqda kirill o'quvchilar ko'p).
Davlat gerbi (`app/assets/images/uz_emblem.png`, mijoz yuklagan rasmiy
PNG) sarlavha va manzil qatoridan pastda, markazda chiziladi — bayroq
mijoz so'ragani bo'yicha olib tashlandi.

Barcha elementlar BITTA A4 sahifaga sig'ishi shart (mijoz so'ragan) — shu
sabab bo'sh joylar qo'lda tor qilib o'lchangan.

ReportLab'ning standart shriftlari (Helvetica va h.k.) kirill belgilarini
umuman qo'llamaydi, shu sabab Noto Sans o'rnatilgan (`app/assets/fonts/`,
SIL OFL litsenziyasi — `NOTICE.md`).
"""
import io
from pathlib import Path

import segno
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

_FONTS_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"
_IMAGES_DIR = Path(__file__).resolve().parent.parent / "assets" / "images"
_FONT_REGULAR = "NotoSans"
_FONT_BOLD = "NotoSans-Bold"
# Mijoz so'ragan brend rangi (frontend/src/app/globals.css --shell bilan bir xil).
_LINE_RGB = (13 / 255, 49 / 255, 56 / 255)  # #0d3138
_TEXT_RGB = (0.098, 0.129, 0.212)  # navy body text, matches admin UI's dark tone

_DEFAULT_DISTRICT = "Uychi"  # QR'da tuman ko'rsatilmagan bo'lsa (eski QR'lar)

_fonts_registered = False


def _district_core_name(district: str) -> str:
    """`qrLocations.ts`dagi tuman nomlari allaqachon "shahri"/"tumani"
    qo'shimchasi bilan keladi (masalan "Navoiy shahri", "Karmana tumani")
    — shu qo'shimchani olib tashlab, sarlavhaga "tumani hokimligi"
    qo'shganda "Navoiy shahri tumani hokimligi" kabi takrorlanish
    bo'lmasligi uchun."""
    stripped = district.strip()
    for suffix in (" shahri", " tumani"):
        if stripped.lower().endswith(suffix):
            return stripped[: -len(suffix)].strip()
    return stripped


def _ensure_fonts() -> None:
    global _fonts_registered
    if _fonts_registered:
        return
    pdfmetrics.registerFont(TTFont(_FONT_REGULAR, str(_FONTS_DIR / "NotoSans-Regular.ttf")))
    pdfmetrics.registerFont(TTFont(_FONT_BOLD, str(_FONTS_DIR / "NotoSans-Bold.ttf")))
    _fonts_registered = True


def generate_qr_png(url: str) -> bytes:
    qr = segno.make(url, error="m")
    buf = io.BytesIO()
    qr.save(buf, kind="png", scale=10, border=3, dark="#19213a")
    return buf.getvalue()


_STEPS = [
    ("Muammoni yozing yoki ovoz bilan ayting", "Муаммони ёзинг ёки овоз билан айтинг"),
    ("Telefon raqamingizni qoldiring", "Телефон рақамингизни қолдиринг"),
    ("Raqam olasiz — SMS orqali xabardor qilamiz", "Рақам оласиз — СМС орқали хабардор қиламиз"),
]


def generate_poster_pdf(
    landing_url: str,
    neighborhood_name: str | None,
    *,
    district: str | None = None,
    mfy: str | None = None,
    street: str | None = None,
) -> bytes:
    """A4 plakat: QR + qisqa yo'riqnoma. Bitta sahifaga sig'adigan qilib
    qo'lda o'lchangan koordinatalar bilan chiziladi (reportlab'da avtomatik
    flow-layout yo'q — shu sabab past-yuqori aniq raqamlar).

    Har bir QR ma'lum bir tuman/MFY/ko'chaga noyob (docs/03 §7.1) — shu
    sabab sarlavha va joylashuv qatori shu QR'ning o'ziga xos manzilidan
    dinamik tuziladi, "Uychi" faqat tuman ko'rsatilmagan eski QR'lar uchun
    zaxira qiymat."""
    _ensure_fonts()
    width, height = A4
    center_x = width / 2

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    district_core = _district_core_name(district) if district else _DEFAULT_DISTRICT

    y = height - 55
    c.setFont(_FONT_BOLD, 22)
    c.drawCentredString(center_x, y, f"{district_core} tumani hokimligi")

    # "Navoiy tumani, Guliston MFY, Tarbiyachi ko'chasi" — mijoz so'ragan:
    # tuman/MFY/ko'cha uchtalasi ham manzil qatorida, tabiiy o'zbekcha
    # shaklda (xom "Guliston, Tarbiyachi" ro'yxati emas).
    location_bits = [f"{district_core} tumani"]
    if mfy:
        location_bits.append(f"{mfy} MFY")
    if street:
        location_bits.append(f"{street} ko'chasi")
    elif neighborhood_name:
        location_bits.append(f"“{neighborhood_name}” mahallasi")
    y -= 24
    c.setFont(_FONT_REGULAR, 15)
    c.drawCentredString(center_x, y, ", ".join(location_bits))

    # Davlat gerbi — sarlavha/manzil qatoridan pastda, markazda (mijoz
    # so'ragan joylashuv).
    emblem_path = _IMAGES_DIR / "uz_emblem.png"
    if emblem_path.exists():
        emblem_img = ImageReader(str(emblem_path))
        emblem_w, emblem_h = emblem_img.getSize()
        draw_h = 60
        draw_w = draw_h * emblem_w / emblem_h
        y -= draw_h + 8
        c.drawImage(
            emblem_img, center_x - draw_w / 2, y, width=draw_w, height=draw_h, mask="auto"
        )

    y -= 34
    c.setFont(_FONT_BOLD, 18)
    c.drawCentredString(center_x, y, "Muammoingiz bormi? Telefoningizda xabar bering!")
    y -= 22
    c.setFont(_FONT_REGULAR, 14)
    c.drawCentredString(center_x, y, "Муаммоингиз борми? Телефонингизда хабар беринг!")

    qr_size = 230
    qr_png = generate_qr_png(landing_url)
    y -= qr_size + 24
    c.drawImage(ImageReader(io.BytesIO(qr_png)), center_x - qr_size / 2, y, width=qr_size, height=qr_size)

    # 3 qadam — markazlashtirilgan (mijoz so'ragan): raqamli doira tepada,
    # ikki tildagi matn ostida, hammasi bitta ustunda markazga tekislangan.
    y -= 38
    for i, (uz, oz) in enumerate(_STEPS, start=1):
        c.setFillColorRGB(*_LINE_RGB)
        c.circle(center_x, y, 12, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont(_FONT_BOLD, 12)
        c.drawCentredString(center_x, y - 4, str(i))

        y -= 25
        c.setFillColorRGB(*_TEXT_RGB)
        c.setFont(_FONT_REGULAR, 12)
        c.drawCentredString(center_x, y, uz)
        y -= 15
        c.setFont(_FONT_REGULAR, 10)
        c.drawCentredString(center_x, y, oz)
        y -= 26

    y -= 12
    c.setFillColorRGB(*_TEXT_RGB)
    c.setFont(_FONT_BOLD, 14)
    c.drawCentredString(center_x, y, "Qiynalsangiz qo'ng'iroq qiling: 71 000 00 00")
    y -= 17
    c.setFont(_FONT_REGULAR, 13)
    c.drawCentredString(center_x, y, "Қийналсангиз қўнғироқ қилинг: 71 000 00 00")

    c.showPage()
    c.save()
    return buf.getvalue()
