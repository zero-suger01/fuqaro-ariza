# Ariza — AI yordamida fuqarolar murojaatlarini qabul qilish va boshqarish platformasi

Fuqarolar rasm va matn orqali murojaat yuboradi (chiqindi, yo'l, elektr, gaz, suv, ekologiya va h.k.), tizim matnni tahlil qilib kategoriyani aniqlaydi va mas'ul tashkilotga yo'naltirishni tavsiya qiladi. Administratorlar barcha murojaatlarni ko'rish, filtrlash, statusini o'zgartirish va statistikani kuzatish imkoniyatiga ega.

Dizayn [fvv.xron.uz](https://fvv.xron.uz/) saytidan olingan token'lar (navy sidebar, oltin accent, Inter shrifti, card radius/shadow) asosida qurilgan.

## Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts, Leaflet (OpenStreetMap)
- **Backend:** FastAPI, SQLAlchemy, Alembic, PostgreSQL
- **Storage:** MinIO (S3-compatible)
- **Auth:** JWT (telefon/email + parol)

## AI haqida muhim eslatma

TZ da ko'rsatilgan YOLO/RT-DETR va CLIP kabi haqiqiy computer-vision modellarini o'qitish uchun GPU va katta hajmdagi belgilangan (labeled) rasm datasetlari kerak — bu loyihada mavjud emas. Shu sabab `backend/app/services/ai/classifier.py` da **matn asosidagi** kalit so'z tahlili orqali ishlaydigan, to'liq ishlaydigan klassifikator qurilgan (10 ta kategoriya, ishonchlilik foizi, tashkilot tavsiyasi). Kelajakda haqiqiy vision-LLM API (masalan, Claude vision) ulash uchun shu faylning `analyze()` funksiyasini almashtirish kifoya — chaqiruvchi kod (router'lar) o'zgarishsiz qoladi.

## Ishga tushirish

### 1. Infratuzilma (PostgreSQL + MinIO)

```bash
docker compose up -d
```

Postgres `localhost:5433` da, MinIO esa `localhost:9000` (API) va `localhost:9001` (konsol) da ishga tushadi.

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # kerak bo'lsa sozlamalarni o'zgartiring
alembic upgrade head
python -m app.seed     # standart tashkilotlar va admin hisobini yaratadi
uvicorn app.main:app --reload --port 8000
```

Standart admin hisobi: `+998900000000` / `admin123`

API: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

## Loyiha tuzilishi

```
backend/
  app/
    models/        SQLAlchemy modellar (User, Complaint, Image, Comment, Organization, Notification)
    schemas/        Pydantic request/response sxemalari
    routers/        auth, complaints, ai, admin, notifications
    services/ai/    matn klassifikatori va tashkilot tavsiyasi
    services/       MinIO yuklash, bildirishnoma yuborish
  alembic/          DB migratsiyalari

frontend/
  src/app/          Next.js sahifalar (login, register, ariza/yangi, murojaatlarim, admin/*)
  src/components/   UI komponentlari va layout (Sidebar, Topbar, MapPicker)
  src/lib/          API client, auth context, status/kategoriya labellari
```

## Keyingi bosqich (TZ 11-bo'lim)

Quyidagilar TZ da "keyingi bosqich" deb belgilangan va bu versiyada amalga oshirilmagan: SMS/Telegram orqali bildirishnoma (real provayder tokeni kerak — `services/notifications.py` da kanal interfeysi tayyor), Telegram bot, mobil ilova, ovozli murojaat, takroriy murojaatlarni aniqlash, Excel/PDF eksport.
