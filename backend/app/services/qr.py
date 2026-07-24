"""QR CRUD (B5.4): QR PNG + A4 plakat PDF generatsiyasi.

Plakat spec: docs/10-ui-ux.md §7 — sarlavha, ulkan QR, 3 qadam, ishonch
telefoni, matn lotin+kirill aralash (qishloqda kirill o'quvchilar ko'p).
Rasmiy gerb yo'q (bunday rasm aktivi loyihada mavjud emas — o'ylab
topilmadi), shu sabab plakat faqat matn+QR bilan cheklangan.

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
_FONT_REGULAR = "NotoSans"
_FONT_BOLD = "NotoSans-Bold"
_ACCENT_RGB = (0.788, 0.635, 0.153)  # #c9a227, docs/10-ui-ux.md accent gold
_TEXT_RGB = (0.098, 0.129, 0.212)  # navy body text, matches admin UI's dark tone

_fonts_registered = False


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
    ("Raqam olasiz — SMS orqali xabardor qilamiz", "Рақам оласиз — SMS орқали хабардор қиламиз"),
]


def generate_poster_pdf(landing_url: str, neighborhood_name: str | None) -> bytes:
    """A4 plakat: QR + qisqa yo'riqnoma. Bitta sahifaga sig'adigan qilib
    qo'lda o'lchangan koordinatalar bilan chiziladi (reportlab'da avtomatik
    flow-layout yo'q — shu sabab past-yuqori aniq raqamlar)."""
    _ensure_fonts()
    width, height = A4
    center_x = width / 2

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    y = height - 70
    c.setFont(_FONT_BOLD, 22)
    c.drawCentredString(center_x, y, "Uychi tumani hokimligi")
    y -= 26
    c.setFont(_FONT_REGULAR, 16)
    c.drawCentredString(center_x, y, "Уйчи тумани ҳокимлиги")

    if neighborhood_name:
        y -= 32
        c.setFont(_FONT_BOLD, 15)
        c.drawCentredString(center_x, y, f"“{neighborhood_name}” mahallasi")

    y -= 50
    c.setFont(_FONT_BOLD, 19)
    c.drawCentredString(center_x, y, "Muammoingiz bormi? Telefoningizda xabar bering!")
    y -= 24
    c.setFont(_FONT_REGULAR, 15)
    c.drawCentredString(center_x, y, "Муаммоингиз борми? Телефонингизда хабар беринг!")

    qr_size = 260
    qr_png = generate_qr_png(landing_url)
    y -= qr_size + 30
    c.drawImage(ImageReader(io.BytesIO(qr_png)), center_x - qr_size / 2, y, width=qr_size, height=qr_size)

    y -= 50
    for i, (uz, oz) in enumerate(_STEPS, start=1):
        c.setFillColorRGB(*_ACCENT_RGB)
        c.circle(80, y, 12, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont(_FONT_BOLD, 12)
        c.drawCentredString(80, y - 4, str(i))

        c.setFillColorRGB(*_TEXT_RGB)
        c.setFont(_FONT_REGULAR, 12)
        c.drawString(105, y + 2, uz)
        c.setFont(_FONT_REGULAR, 11)
        c.drawString(105, y - 13, oz)
        y -= 45

    y -= 20
    c.setFillColorRGB(*_TEXT_RGB)
    c.setFont(_FONT_BOLD, 14)
    c.drawCentredString(center_x, y, "Qiynalsangiz qo'ng'iroq qiling: 71 000 00 00")
    y -= 18
    c.setFont(_FONT_REGULAR, 13)
    c.drawCentredString(center_x, y, "Қийналсангиз қўнғироқ қилинг: 71 000 00 00")

    c.showPage()
    c.save()
    return buf.getvalue()
