"""M16 - kategoriya tavsiflari (kontrakt v1.8)

`categories.descriptions` — LLM promptiga uzatiladigan qisqa chegara izohi
(`{"uz": "...", ...}`, ixtiyoriy).

Nega kerak: docs/07 §1.1 promptni «kod — **tavsif** ro'yxati» deb ta'riflaydi
va §5 aniqlikni oshirish vositasi sifatida «kategoriya **tavsiflarini**
aniqlashtirish»ni ko'rsatadi — lekin `categories` jadvalida bunday ustun
UMUMAN yo'q edi va prompt faqat `kod: nom` yuborardi. Ya'ni hujjat mavjud
bo'lmagan vositaga tayanardi.

Amalda bu chegaraviy holatlarda ko'rinadi: «ko'cha chiroqlari yonmayapti»
uchun LLM faqat «Yo'l va transport» va «Elektr energiyasi» degan ikki
so'zlik yorliqlarni ko'radi — ko'cha yoritishi kimning zimmasida ekani
hech qayerda yozilmagan. Tavsif aynan shu chegarani aytadi.

`names` bilan bir xil JSONB shakli tanlandi: ko'p tilli va migratsiyasiz
kengayadi. NULL bo'lsa prompt avvalgidek faqat nom bilan ishlaydi, ya'ni
o'zgarish orqaga mos.

Revision ID: m16_category_descriptions
Revises: m15_citizen_hide_complaints

(M15 raqami sherikning `m15_citizen_hide_complaints` migratsiyasiga ketdi —
ikkalamiz ham bir vaqtda m14 ustiga qurgan edik, bu Alembic'da ikki bosh
berardi. Zanjir shu yerda ulanadi: sherikning migratsiyasi allaqachon
uning bazasida qo'llangan, shuning uchun ko'chirilgani BU fayl.)
Create Date: 2026-07-27 10:00:00.000000

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = 'm16_category_descriptions'
down_revision = 'm15_citizen_hide_complaints'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'categories',
        sa.Column('descriptions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('categories', 'descriptions')
