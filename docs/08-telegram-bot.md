# 08 — Telegram bot workstream (T-fazalar)

Egasi: keyin kelishiladi (Python — backend sherikga yaqin, lekin API orqali ishlagani uchun istalgan kishi qila oladi). Stack: **aiogram 3**, alohida `bot/` papka, alohida protsess. Backend bilan FAQAT HTTP ([03-kontraktlar.md](03-kontraktlar.md) §3, §6) — DB'ga to'g'ridan-to'g'ri kirish TAQIQLANADI.

Bot ham fuqaro kanali — [10-ui-ux.md](10-ui-ux.md) soddalik qoidalari unga ham tegishli: qisqa xabarlar, katta aniq tugmalar (ReplyKeyboard), texnik so'z yo'q, har doim "Bekor qilish" tugmasi.

## Tuzilma

```
bot/
  main.py            # polling ishga tushirish
  config.py          # TELEGRAM_BOT_TOKEN, BACKEND_URL, BOT_API_TOKEN
  api.py             # backend HTTP klienti
  i18n.py            # 4 til matnlari (frontend messages bilan MA'NO jihatdan sinxron)
  handlers/
    start.py         # /start, til tanlash, kontakt so'rash
    complaint.py     # murojaat FSM (matn/ovoz/rasm/lokatsiya)
    status.py        # holat ko'rish
  keyboards.py
  requirements.txt   # aiogram==3.x, httpx
```

Haqiqiy fayllarda yana `states.py` (FSM holatlari), `storage.py` (fuqaro profilini Redis'da doimiy saqlash — FSM state'idan alohida) va `utils.py` (`normalize_phone`) bor — kontraktda alohida yozilmagan yordamchi modullar, hech qanday og'ish emas.

**Holat:** T1 (asosiy oqim) va T3.1/T3.2 (xatolar/help) kod jihatdan tayyor va real backend'ga qarshi qo'lda sinovdan o'tkazilgan (`api.py`ning har bir funksiyasi + to'liq FSM zanjiri). **Lekin real Telegram serveriga ulanib ishga tushirilmagan** — buning uchun @BotFather'dan `TELEGRAM_BOT_TOKEN` kerak, hozircha yo'q. Token kelgach: `cd bot && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`, `.env.example`dan `.env` yasab tokenlarni to'ldirish (`BOT_API_TOKEN` backend'dagi bilan AYNAN bir xil bo'lishi kerak), so'ng `python main.py`.

## T1 — Asosiy oqim (P3)

- [x] **T1.1 (S)** Skelet: aiogram 3 + FSM storage (Redis, `bot:profile:{chat_id}` — doimiy fuqaro profili FSM'dan alohida, `state.clear()`da yo'qolmaydi), /start → til tanlash (4 tugma) → asosiy menyu: **"📝 Murojaat yuborish"**, **"📋 Murojaatlarim"**, **"ℹ️ Yordam"**.
- [x] **T1.2 (S)** Kontakt bog'lash: birinchi murojaatdan oldin "Telefon raqamni ulashing" (`request_contact=True` tugmasi — fuqaro yozmaydi, bosadi; raqam Telegram tomonidan tasdiqlangan keladi) → `POST /api/bot/citizens/link`.
- [x] **T1.3 (M)** Murojaat FSM (`handlers/complaint.py`, wizard bilan bir xil mantiq, [10](10-ui-ux.md) §4):
  1. "Muammoni yozing yoki ovozli xabar yuboring 🎤" — text YOKI voice qabul qiladi (voice → `POST /api/public/stt` + poll → "Matningiz: ... To'g'rimi?" tasdiq);
  2. "Rasm bo'lsa yuboring (bo'lmasa O'tkazib yuborish)" — 5 tagacha photo;
  3. "Qayerda?" — mahalla tanlash (inline paginated ro'yxat, `GET /api/public/neighborhoods`) + ixtiyoriy lokatsiya tugmasi (`request_location`) — ikkalasidan biri kifoya;
  4. Tasdiq xabari (hammasi bir xabarda) → "✅ Yuborish" → `POST /api/bot/complaints` → ticket raqami katta qilib + "Holatini shu yerda 'Murojaatlarim'dan ko'rasiz".
  - Har qadamda "◀️ Orqaga" va "❌ Bekor qilish". **Real backend'ga qarshi qo'lda sinovdan o'tkazildi** (aiogram dispatcher'siz, handler funksiyalarini to'g'ridan-to'g'ri chaqirib, mock Message/CallbackQuery bilan): til tanlash → kontakt bog'lash → tavsif → rasmlarni o'tkazib yuborish → mahalla tanlash → tasdiqlash → real ticket qaytdi (`UY-2026-000051`), "Murojaatlarim" ro'yxatida to'g'ri chiqdi.
- [x] **T1.4 (S)** "Murojaatlarim": `GET /api/bot/complaints?telegram_chat_id=` → ro'yxat (ticket + status_simple emoji bilan: 🟡 qabul, 🔵 ko'rilmoqda, 🟠 ijroda, 🟢 yakunlandi, 🔴 rad).
- [x] **T1.5 (S)** QR deep-link: `/start qr_<code>` → `GET /api/public/qr/{code}` → mahalla avtomatik tanlangan holda murojaat FSM boshlanadi (yangi/mavjud fuqaro — ikkalasi ham qo'llab-quvvatlanadi).

## T2 — Bildirishnomalar (backend tomonda, B4.2 bilan birga)

- [ ] **T2.1 (S)** Status o'zgarganda/javob yuborilganda backend worker `sendMessage` chaqiradi (shablonlar 4 tilda, fuqaro tili bo'yicha). Bot protsessi bunga aralashmaydi.
- [ ] **T2.2 (S)** need_info: xabar ichida xodimning savoli + "Javob yozish" tugmasi → fuqaro yozgani `POST /api/bot/complaints/info` orqali backendga ketadi ([03](03-kontraktlar.md) §6, v1.4 da kontraktga qo'shildi; `info_provided` event, murojaat avtomatik `in_progress` ga qaytadi).
- [ ] **T2.3 (S)** `resolved` xabariga «Hal bo'ldimi? [Ha] [Yo'q]» inline tugmalari → `POST /api/bot/complaints/feedback` ([03](03-kontraktlar.md) §3.6/§6). «Yo'q» → izoh so'raladi, murojaat qayta ochiladi.

## T3 — Sayqal (P3 oxiri)

- [x] **T3.1 (S)** Xatolar: har bir `api.py` chaqiruvi `ApiError` bilan o'raladi — backend yotsa/xato bersa "Hozircha texnik ishlar..." (`error_generic`), 429 `rate_limited` kodida alohida xabar (`error_rate_limited`), 422 validatsiya xatosida `error_validation`. 5 ta rasm chegarasiga yetganda yumshoq ogohlantirish (`photo_limit_reached`). Dispatcher darajasida global xato ushlagich (`main.py` `@dispatcher.errors()`) — kutilmagan istisno bo'lsa ham bot qotib qolmaydi, foydalanuvchiga `error_generic` yuboriladi va log yoziladi.
- [x] **T3.2 (S)** `/help` buyrug'i + "ℹ️ Yordam" menyu tugmasi (`handlers/start.py`); buyruqlar menyusi 4 tilda (`main.py` `set_my_commands`, Telegram Bot API'ning `language_code` parametri bilan — uz standart, oz/ru/en alohida).
- [ ] **T3.3 (S)** Deploy: `bot/Dockerfile`, compose'ga servis ([11-devops.md](11-devops.md)), restart policy, log.

## Acceptance (C3 checkpoint qismi)

Telefondagi Telegram'da: /start → til → kontakt ulashish → ovozli xabar bilan murojaat → ticket keladi → admin panelda source=telegram bilan ko'rinadi → admin status o'zgartirsa fuqaroga xabar keladi → "Murojaatlarim"da yangi holat.
