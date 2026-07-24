# 01 — Hozirgi holat (codebase auditi)

Audit sanasi: 2026-07-24, `main` @ d317716 ("Initial commit"). Bu hujjat — "nima bor, nima yo'q" ning haqiqiy manzarasi. Yangi tasklar shu gap'lardan kelib chiqqan.

## 1. Nima bor (ishlaydi)

### Backend — FastAPI (Python), `backend/`

- **Stack:** FastAPI 0.115, SQLAlchemy 2, Alembic, PostgreSQL (5433), MinIO (boto3), JWT (python-jose), bcrypt. TZ'dagi NestJS EMAS — bu farq [02-arxitektura.md](02-arxitektura.md) da hal qilingan (FastAPI qoladi).
- **Modellar** (`app/models/`): `User` (user/admin rollari), `Complaint`, `ComplaintImage`, `Comment`, `Organization`, `Notification`.
- **Auth** (`routers/auth.py`): register/login (telefon yoki email + parol), JWT 7 kun, `/api/auth/me`.
- **Murojaatlar** (`routers/complaints.py`): yaratish (multipart, rasmlar bilan, description ≥20 belgi), mening ro'yxatim, tafsilot. Yaratishda sinxron keyword-AI ishlaydi.
- **AI** (`services/ai/classifier.py`): 10 kategoriya bo'yicha **hardcoded Python dict** keyword'lar, substring hisoblash, confidence = 0.55 + 0.15×hit (topilmasa `boshqa`, 0.35). `routers/ai.py` → `/api/ai/analyze` (auth talab qiladi). `recommend.py` — kategoriya→tashkilot nomlari (hardcoded).
- **Admin** (`routers/admin.py`): murojaatlar ro'yxati (status/kategoriya/tuman/mahalla/sana/search filtrlar), tafsilot, status o'zgartirish, tashkilot biriktirish, izoh, tashkilotlar ro'yxati, dashboard/chart statistikasi.
- **Bildirishnoma** (`services/notifications.py`): in-app + ixtiyoriy SMTP email. SMS/Telegram yo'q (enum'da bor, xolos).
- **Storage** (`services/storage.py`): MinIO bucket (public-read), rasm yuklash.
- **Seed** (`app/seed.py`): 9 tashkilot + admin (`+998900000000`/`admin123`).
- Alembic: bitta init migratsiya. `/api/health` bor.

### Frontend — Next.js, `frontend/`

- **Stack:** Next.js **16.2.11** (App Router) + React 19.2 + Tailwind v4 + Recharts + Leaflet. `frontend/AGENTS.md` ogohlantiradi: bu Next.js versiyasi training data'dan farq qilishi mumkin — shubha bo'lsa `node_modules/next/dist/docs/` o'qilsin.
- **Dizayn tokenlari** (`globals.css`): navy sidebar + oltin accent (#c9a227), Inter/JetBrains Mono, radius/shadow tizimi. Toza va professional.
- **Sahifalar:** `/` (fuqaro dashboard), `/login`, `/register`, `/ariza/yangi` (forma: rasm, matn, debounce'li AI tahlil, GPS/xarita, manzil), `/murojaatlarim` + `[id]` (StatusTimeline), `/bildirishnomalar`, `/admin` (dashboard, murojaatlar+tafsilot, statistika, tashkilotlar).
- **Infra:** `lib/api.ts` (fetch wrapper, token localStorage), `lib/auth.tsx` (context), `lib/types.ts` + `lib/status.ts` (backend bilan qo'lda sinxron tiplar/labellar), `AppShell` (sidebar+topbar, admin guard), `MapPicker`, UI kitchasi (Card/Badge/Button/Input).

### Infra

- `docker-compose.yml`: faqat Postgres + MinIO (app konteynerlari yo'q). CI/CD, nginx yo'q.

## 2. Kritik muammolar (mavjud kodda)

| # | Muammo | Qayerda | Oqibat |
|---|---|---|---|
| K1 | **Murojaat uchun ro'yxatdan o'tish MAJBURIY** | butun oqim | 70+ fuqaro uchun asosiy to'siq. Yangi arxitekturada guest-flow bo'ladi |
| K2 | **Mobilda navigatsiya yo'q** — sidebar `hidden md:flex` | `Sidebar.tsx` | Telefonda menyu umuman ko'rinmaydi; fuqarolar esa asosan telefonda |
| K3 | Ticket raqami yo'q (faqat UUID) | `Complaint` | Fuqaro "mening raqamim" deb aytolmaydi, SMS/qog'ozga yozib bo'lmaydi |
| K4 | Login'siz holat tekshirish yo'q | — | Guest-flow'ning ikkinchi yarmi yo'q |
| K5 | Pagination yo'q (admin ro'yxat butun jadvalni oladi) | `admin.py`, admin FE | 1000+ murojaatda sekinlashadi |
| K6 | Fayl validatsiyasi yo'q (tur/hajm/magic-byte), bucket public-read | `storage.py` | Xavfsizlik: istalgan fayl yuklash mumkin |
| K7 | Rate limit / captcha yo'q | butun API | Spam va brute-force ochiq |
| K8 | Statistika UTC bilan ishlaydi ("bugun" noto'g'ri) | `admin.py` | Asia/Tashkent bo'yicha hisoblash kerak |
| K9 | Kategoriya va keywordlar kodga qotirilgan | `classifier.py` | Admin keyword qo'sha olmaydi — o'rganish sikli imkonsiz |
| K10 | AI sinxron chaqiriladi (submit ichida) | `complaints.py` | LLM qo'shilsa submit sekundlab qotadi — queue kerak |
| K11 | JWT localStorage'da | `api.ts` | XSS'ga zaif; MVP uchun qolsa ham, admin uchun keyin httpOnly cookie ko'rib chiqiladi |
| K12 | Email uniqueness sharti g'alati yozilgan | `auth.py:17` | Ishlaydi, lekin chalkash — refactor |

## 3. TZ va yangi talablar bo'yicha YO'Q narsalar (gap-jadval)

| Soha | Yo'q narsa | Qayerda hal qilinadi |
|---|---|---|
| Fuqaro UX | Guest wizard, sodda 4-bosqichli holat ko'rinishi, katta shrift/tugmalar, public landing | [06](06-frontend-tasklar.md), [10](10-ui-ux.md) |
| Ticket | `UY-2026-000123` format, yillik counter | [03](03-kontraktlar.md), [05](05-backend-tasklar.md) |
| i18n | uz/oz/ru/en — hech biri yo'q (hammasi lotin-o'zbek hardcoded) | [03](03-kontraktlar.md) §7, [06](06-frontend-tasklar.md) |
| AI | Lokal LLM fallback (Ollama+Gemma), priority, sentiment, summary, javob drafti, teglar, o'rganish sikli, ovoz→matn | [07-ai-layer.md](07-ai-layer.md) |
| Workflow | To'liq status lifecycle, SLA/deadline, eskalatsiya, timeline (event history) jadvali | [03](03-kontraktlar.md), [05](05-backend-tasklar.md) |
| Tashkiliy | Departments (ichki bo'lim + tashqi tashkilot), 4 xodim roli, biriktirish (assignment), javoblar (replies) | [04-database.md](04-database.md) |
| Bildirishnoma | SMS (Eskiz), Telegram orqali xabar | [05](05-backend-tasklar.md) B4 |
| Media | Video, audio fayllar (faqat rasm bor) | [03](03-kontraktlar.md), [05](05-backend-tasklar.md) |
| Analitika | Heatmap, mahalla/bo'lim/xodim KPI, AI KPI, eksport | [05](05-backend-tasklar.md) B5, [06](06-frontend-tasklar.md) F4 |
| Qidiruv | Global search (ticket/telefon/mahalla/teg) | [05](05-backend-tasklar.md) B5 |
| Xavfsizlik | Rate limit, captcha (guest form uchun), fayl validatsiya, audit log | [05](05-backend-tasklar.md) B4 |
| Kanallar | Telegram bot, QR landing, mobil ilova | [08](08-telegram-bot.md), [06](06-frontend-tasklar.md) F3, [09](09-mobile.md) |
| DevOps | App dockerfile'lari, nginx, CI, backup, Ollama servisi | [11-devops.md](11-devops.md) |
| DB | citizens, departments, categories (jadval), keywords, events, replies, ai_analyses, files, audit va h.k. | [04-database.md](04-database.md) |

## 4. Saqlab qolinadigan narsalar

- FastAPI backend skeleti, auth/JWT, MinIO storage, Alembic — hammasi asos bo'lib qoladi.
- Frontend dizayn tokenlari (navy+gold), UI kitchasi, admin sahifalar strukturasi — admin panel shular ustiga quriladi.
- `MapPicker`, `StatusTimeline` (yangi statuslarga moslanadi), Recharts grafiklar.
- Keyword klassifikator g'oyasi — lekin data DB'ga ko'chadi va normalizatsiya + LLM fallback qo'shiladi ([07](07-ai-layer.md)).

Xulosa: mavjud kod — yaxshi "admin-MVP" skelet. Endi ustiga (1) fuqaro tomonini guest+sodda qilib qayta qurish, (2) AI qatlamini chuqurlashtirish, (3) workflow/SLA, (4) kanallar (bot, QR, SMS) qo'shiladi.
