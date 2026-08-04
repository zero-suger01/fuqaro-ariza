"""M20 - import MFY names supplied in the Namangan administrative DOCX.

The source document states 790+ total MFYs but contains a shorter visible
summary list. Only names actually present in the supplied document are loaded.
"""

import sqlalchemy as sa
from alembic import op

revision = "m20_namangan_mfy_source"
down_revision = "m19_namangan_official_districts"
branch_labels = None
depends_on = None

MFYS = {
    "DAVLATOBOD": "Yuksalish|Yelxona|Orzu|Navbahor|Davlatobod|Porloq|Begimqul|To'qimachi|Obod|Shodlik|Mehnatobod|Mustaqillik|Navro'z|Guliston",
    "YANGI_NAMANGAN": "Axsaxent|Mingchinor|Bunyodkor|O'zbekiston|Go'zal|Zarafshon|Yangi Avlod|Sangzor|Qoraqosh|Chustko'cha",
    "NAMANGAN_SHAHRI": "Chorsu|Bobur|Nodira|Hamza|Go'zal|Lola|Saroy|G'irvon|Marg'izor|Tashkent|Istiqlol|Zangisota",
    "CHORTAQ": "Mustaqillik|Chortoq|Dehqonobod|Bobur|Bog'iston|Guliston|Tinchlik|Alixon|Karaskan|Koroson|Muchum|Ayroncha|Hazratsho|Saroy|Baliqli|Gulshan|Navbahor|O'rta Saroy",
    "CHUST": "Pansada|Do'stlik|Chust|Kamolot|Boyston|Sadcha|Teshiktosh|Gova|Olmos|Varzik|Karnon|Yorqishloq|Shayan|Baymoq|Karkidon|Qoraqo'rg'on|Sarimsoqtepa|Birlik",
    "KOSONSOY": "Kosonsoy|Navbahor|Yangiyo'l|Chustko'cha|Bog'iston|Do'stlik|Teringabod|O'zgurut|Chindavul|Guiron|Kuqumboy|Yayra|Terachi|Lola|Toshqo'rg'on",
    "MINGBULOQ": "Mustaqillik|Jomashuy|Gurtepa|Dovduq|Mulaqqo|Avangard|Yangizamon|Bo'ston|O'rmonbek|Qo'g'ay-O'lmas",
    "NAMANGAN_TUMANI": "Toshbuloq|Mirishkor|Shohirobod|G'irvon|Qoraqash|Rovuston|Qiyot|Xonobod|Birlik|Irvad|Navbahor",
    "NORIN": "Haqqulobod|Dehqonobod|Do'stlik|Mustaqillik|Obod|Sho'rariq|Marg'izar|Paxtakor|O'zbekiston|Qorateri|Uchtepa|Katta Marg'izar|Toshloq",
    "POP": "Pop|Chorkesar|Do'stlik|Istiqlol|Navbahor|Chodak|Uyg'ur|Sang|G'urumsaray|Pungon|Xonobod|Vodil|Madaniyat|Qandag'on|Ishtixon",
    "TORAQORGON": "To'raqo'rg'on|O'zbekiston|Saodat|Mustaqillik|Yangiyaer|Shahand|Axsi|Yandama|Saroy|Mozorkuh|Kichik Qurama|Buramatut|Namandon|Qo'shand|Shohidon",
    "UCHQORGON": "Uchqo'rg'on|Tinchlik|Dehqonobod|Mustaqillik|Do'stlik|Qayqi|Yashik|Yangiyo'l|Uchtepa|Quyi Qayqi|Katta Qayqi|Bo'ston|Yangi Cahar",
    "UYCHI": "Uychi|Jiydakapa|Mashad|Birlashgan|Ziyakor|Qumtepa|Ro'vot|Soku|O'nxayat|Churtuk|Dehqonobod",
    "YANGIQORGON": "Nanay|Zarkent|Poromon|Bekobod|Navkent|Sang|G'ovazon|Qorapolvon|Sharq yulduzi|Rovot|Mamay",
}


def upgrade() -> None:
    conn = op.get_bind()
    # Remove only the clearly marked demo/sample rows; preserve real records.
    conn.execute(sa.text("""
        UPDATE qr_codes SET neighborhood_id = NULL
        WHERE neighborhood_id IN (SELECT id FROM neighborhoods WHERE name LIKE 'NAMUNA %')
    """))
    conn.execute(sa.text("""
        UPDATE complaints SET neighborhood_id = NULL
        WHERE neighborhood_id IN (SELECT id FROM neighborhoods WHERE name LIKE 'NAMUNA %')
    """))
    conn.execute(sa.text("DELETE FROM neighborhoods WHERE name LIKE 'NAMUNA %'"))
    for code, names in MFYS.items():
        for name in dict.fromkeys(names.split("|")):
            conn.execute(sa.text("""
                INSERT INTO neighborhoods (id, district_id, name, is_active)
                SELECT gen_random_uuid(), d.id, CAST(:name AS varchar), true
                FROM districts d JOIN regions r ON r.id = d.region_id
                WHERE d.code = CAST(:code AS varchar) AND r.code = 'NAMANGAN'
                  AND NOT EXISTS (
                    SELECT 1 FROM neighborhoods n WHERE n.district_id = d.id AND n.name = CAST(:name AS varchar)
                  )
            """), {"code": code, "name": name})


def downgrade() -> None:
    conn = op.get_bind()
    for code, names in MFYS.items():
        conn.execute(sa.text("""
            DELETE FROM neighborhoods n USING districts d, regions r
            WHERE n.district_id = d.id AND d.region_id = r.id
              AND d.code = :code AND r.code = 'NAMANGAN' AND n.name = ANY(:names)
        """), {"code": code, "names": names.split("|")})
