"""Seed default organizations and an admin user for local development.

Run with: python -m app.seed
"""
from app.core.security import hash_password
from app.database import SessionLocal
from app.models.organization import Organization
from app.models.user import User, UserRole

ORGANIZATIONS = [
    ("Sanitariya xizmati", "chiqindi"),
    ("Yo'l xo'jaligi boshqarmasi", "yol"),
    ("Elektr tarmoqlari korxonasi", "elektr"),
    ("Hudgaz (gaz ta'minoti xizmati)", "gaz"),
    ("Suvsoz (suv ta'minoti xizmati)", "suv"),
    ("Obodonlashtirish boshqarmasi", "obodonlashtirish"),
    ("Ekologiya va atrof-muhitni muhofaza qilish qo'mitasi", "ekologiya"),
    ("Davlat arxitektura-qurilish nazorati inspeksiyasi", "qurilish"),
    ("Tuman hokimligi murojaatlar bo'limi", "boshqa"),
]


def run() -> None:
    db = SessionLocal()
    try:
        if db.query(Organization).count() == 0:
            for name, category in ORGANIZATIONS:
                db.add(Organization(name=name, category=category))
            print(f"Seeded {len(ORGANIZATIONS)} organizations")

        admin_phone = "+998900000000"
        if not db.query(User).filter(User.phone == admin_phone).first():
            db.add(
                User(
                    first_name="Admin",
                    last_name="Adminov",
                    phone=admin_phone,
                    email="admin@ariza.uz",
                    password_hash=hash_password("admin123"),
                    role=UserRole.ADMIN,
                )
            )
            print(f"Seeded admin user: {admin_phone} / admin123")

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run()
