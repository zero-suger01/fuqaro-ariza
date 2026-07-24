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

## T1 — Asosiy oqim (P3)

- [ ] **T1.1 (S)** Skelet: aiogram 3 + FSM storage (Redis), /start → til tanlash (4 tugma) → asosiy menyu: **"📝 Murojaat yuborish"**, **"📋 Murojaatlarim"**, **"ℹ️ Yordam"**.
- [ ] **T1.2 (S)** Kontakt bog'lash: birinchi murojaatdan oldin "Telefon raqamni ulashing" (`request_contact=True` tugmasi — fuqaro yozmaydi, bosadi; raqam Telegram tomonidan tasdiqlangan keladi) → `POST /api/bot/citizens/link`.
- [ ] **T1.3 (M)** Murojaat FSM (wizard bilan bir xil mantiq, [10](10-ui-ux.md) §4):
  1. "Muammoni yozing yoki ovozli xabar yuboring 🎤" — text YOKI voice qabul qiladi (voice → backend STT → "Matningiz: ... To'g'rimi?" tasdiq);
  2. "Rasm bo'lsa yuboring (bo'lmasa O'tkazib yuborish)" — 5 tagacha photo;
  3. "Qayerda?" — mahalla tanlash (inline paginated ro'yxat, `GET /api/public/neighborhoods`) + ixtiyoriy lokatsiya tugmasi (`request_location`);
  4. Tasdiq xabari (hammasi bir xabarda) → "✅ Yuborish" → `POST /api/bot/complaints` → ticket raqami katta qilib + "Holatini shu yerda 'Murojaatlarim'dan ko'rasiz".
  - Har qadamda "◀️ Orqaga" va "❌ Bekor qilish".
- [ ] **T1.4 (S)** "Murojaatlarim": `GET /api/bot/complaints?telegram_chat_id=` → ro'yxat (ticket + status_simple emoji bilan: 🟡 qabul, 🔵 ko'rilmoqda, 🟠 ijroda, 🟢 yakunlandi, 🔴 rad).
- [ ] **T1.5 (S)** QR deep-link: `/start qr_<code>` → `GET /api/public/qr/{code}` → mahalla avtomatik tanlangan holda murojaat FSM boshlanadi.

## T2 — Bildirishnomalar (backend tomonda, B4.2 bilan birga)

- [ ] **T2.1 (S)** Status o'zgarganda/javob yuborilganda backend worker `sendMessage` chaqiradi (shablonlar 4 tilda, fuqaro tili bo'yicha). Bot protsessi bunga aralashmaydi.
- [ ] **T2.2 (S)** need_info: xabar ichida "Javob yozish" tugmasi → fuqaro yozgani `citizen_reply` event sifatida backendga (`POST /api/bot/complaints/{ticket}/reply` — kontraktga qo'shiladi, docs-first tartibda).

## T3 — Sayqal (P3 oxiri)

- [ ] **T3.1 (S)** Xatolar: backend yotsa "Hozircha texnik ishlar, birozdan keyin urinib ko'ring"; rate limit xabari; media limitlari haqida yumshoq ogohlantirishlar.
- [ ] **T3.2 (S)** /help + hokimlik kontaktlari; buyruqlar menyusi (setMyCommands, 4 tilda).
- [ ] **T3.3 (S)** Deploy: `bot/Dockerfile`, compose'ga servis ([11-devops.md](11-devops.md)), restart policy, log.

## Acceptance (C3 checkpoint qismi)

Telefondagi Telegram'da: /start → til → kontakt ulashish → ovozli xabar bilan murojaat → ticket keladi → admin panelda source=telegram bilan ko'rinadi → admin status o'zgartirsa fuqaroga xabar keladi → "Murojaatlarim"da yangi holat.
