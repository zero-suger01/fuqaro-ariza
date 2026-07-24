# 10 — UI/UX: soddalik qonunlari va ekran spetsifikatsiyalari

Bosh foydalanuvchi obrazi: **Malohat opa, 72 yosh, qishloqda yashaydi, oddiy Android telefon, sekin internet, texnik so'z bilmaydi, ko'zi xiraroq.** Har dizayn qarori shu odam sinovidan o'tishi kerak: *"Malohat opa buni yordamisiz qila oladimi?"* Yo'q bo'lsa — qayta dizayn.

## 1. Ikki dunyo, ikki uslub

| | Fuqaro sahifalari (`/`, `/yangi`, `/holat`, `/go`) | Admin (`/admin/*`) |
|---|---|---|
| Layout | Sidebar YO'Q. Bitta ustun, markazda, max-width 640px | Mavjud navy sidebar + jadval uslubi qoladi |
| Auditoriya | 70+ qishloq fuqarosi, telefon | O'rgatilgan xodim, kompyuter |
| Zichlik | Juda past, katta elementlar | Yuqori (jadvallar, filtrlar) |
| Til | 4 til, juda sodda so'zlar | Boshlanishiga uz |

## 2. Fuqaro sahifalari uchun QAT'IY qoidalar

1. **Shrift:** body ≥ 18px, sarlavha ≥ 28px, ticket raqami ≥ 36px. Line-height ≥ 1.6.
2. **Tugmalar:** balandligi ≥ 56px, to'liq kenglik (mobil), matn + ikon birga, bosilganda aniq holat o'zgarishi.
3. **Bitta ekran — bitta savol.** Skroll qilmasdan asosiy harakat ko'rinsin.
4. **So'zlar:** "Submit/Kategoriya/Autentifikatsiya" EMAS → "Yuborish / Muammo turi / —". Buyruq gaplar qisqa: "Muammoni yozing".
5. **Majburiy maydonlar minimal:** muammo matni (yoki ovoz), telefon, ism. Qolgan hammasi ixtiyoriy va "Qo'shimcha" ostida yashirin.
6. **Xatolar yumshoq va aniq:** "Telefon raqamda xato bor. Namuna: +998 90 123 45 67" — maydon yonida, qizil, katta.
7. **Hech qanday deadline'li captcha, parol, SMS-kod** fuqaro yo'lida (Turnstile ko'rinmas rejimda ishlaydi).
8. **Rang + belgi birga** (faqat rangga tayanmaslik): holat qadamlarida ✓ belgi, matn yozuvi.
9. **Kutish holatlari tushuntiriladi:** "Ovozingiz matnga aylantirilmoqda... ⏳ (bir daqiqa kutib turing)".
10. **Har sahifada telefon raqami:** "Qiynalsangiz qo'ng'iroq qiling: XX XXX XX XX" (ishonch telefoni, footerda).

## 3. Landing `/`

Tepada: gerb/logo + til tanlagich ("O'z · Ўз · Ру · En" — matn, bayroq emas). Markazda:

```
Hurmatli fuqaro!
Muammoingizni bizga ayting — hal qilamiz.

[  📝  MUROJAAT YUBORISH  ]        ← accent (oltin), ulkan
[  🔍  HOLATINI TEKSHIRISH ]       ← ikkilamchi, oq

Qanday ishlaydi?
1️⃣ Muammoni yozing yoki ovoz bilan ayting
2️⃣ Telefon raqamingizni qoldiring
3️⃣ Raqam olasiz — SMS orqali xabardor qilamiz
```

Footer: hokimlik nomi, ishonch telefoni, Telegram bot havolasi.

## 4. Wizard `/yangi` (3 qadam)

Tepa: orqaga strelka + progress (● ● ○) + "2/3-qadam".

**1-qadam — "Muammoni ayting"**
- Katta textarea (placeholder: "Masalan: Ko'chamizda 3 kundan beri suv yo'q...").
- Ostida 2 katta tugma yonma-yon: `🎤 Ovoz bilan aytish` va `📷 Rasm qo'shish`.
- Ovoz rejimi: bosilganda katta qizil doira (yozilmoqda animatsiya + sekundlar), "To'xtatish" → "Matnga aylantirilmoqda..." → matn textarea'ga tushadi + "Matnni tekshirib oling" eslatmasi.
- Rasm: kvadrat previewlar, ❌ bilan o'chirish, max 5.
- "Qo'shimcha" (accordion, standart yopiq): muammo turi (select, "AI o'zi aniqlaydi" izohi bilan), video.
- Davom shartı: matn ≥ 10 belgi YOKI audio bor.

**2-qadam — "Qayerda?"**
- Mahalla: katta select/qidiruvli ro'yxat ("Mahallangizni tanlang").
- Manzil: bitta input ("Ko'cha, uy (bilsangiz)") — ixtiyoriy.
- `📍 Xaritadan ko'rsatish` tugmasi (ixtiyoriy, ochilsa MapPicker, markaz Uychi tumani; GPS so'rovi faqat shu tugma bosilganda).

**3-qadam — "Siz haqingizda"**
- Ismingiz (bitta input), Telefon (avtoformat, klaviatura tel).
- Izoh: "Bu raqamga natijani SMS qilib yuboramiz".
- `✅ YUBORISH` (ulkan). Bosilganda: spinner + "Yuborilmoqda...".

**Muvaffaqiyat ekrani**
```
✅ Murojaatingiz qabul qilindi!

Sizning raqamingiz:
┌─────────────────────┐
│   UY-2026-000145    │   ← 36px+, nusxa tugmasi
└─────────────────────┘
📱 Bu raqamni rasmga olib qo'ying.
SMS ham yubordik.

[ Holatini tekshirish ]   [ Bosh sahifa ]
```

Draft localStorage'da: sahifa yopilib qolsa qaytganda "Boshlagan murojaatingizni davom ettirasizmi?" so'raladi.

## 5. Holat sahifasi `/holat`

2 input: "Murojaat raqami" (UY-____-______ mask) + "Telefon raqamingiz" → `Tekshirish`. Natija — vertikal 4 qadam (mobilga vertikal osonroq):

```
✓ Qabul qilindi        24-iyul, 09:30
✓ Ko'rib chiqilmoqda   24-iyul, 10:02
● Ijroda               24-iyul, 12:15
○ Yakunlandi
```

Javob bo'lsa: yashil karta "Hokimlik javobi: ...". Rad bo'lsa: qizil karta + sabab. need_info: sariq karta "Sizdan qo'shimcha ma'lumot kutilmoqda — telefoningizga qo'ng'iroq qilinadi yoki SMS keladi".

## 6. Admin tafsilot sahifasi (F2.2 uchun eskiz)

Chap ustun (2/3): media galereya → murojaat matni (asl + STT belgisi) → fuqaro kartasi (ism, tel, mahalla, source ikon) → xarita. O'ng ustun (1/3): **AI paneli** (kategoriya + confidence progress bar, priority rangli badge, sentiment, summary, teglar; needs_review bo'lsa sariq ramka) → status boshqaruvi (faqat ruxsatli o'tish tugmalari) → biriktirish → **Javob editori** (AI drafti tayyor turadi, tahrir → kanal checkbox → Yuborish) → Timeline (events, pastga qarab).

## 7. QR oqimi `/go`

Plakat QR → `https://<domen>/go?m=<qr_code>`. Sahifa (til tanlagich tepada):

```
Uychi tumani hokimligi
"Bog'ishamol" mahallasi          ← QR mahallaga bog'langan bo'lsa

Murojaatni qayerdan yuborasiz?

[ 🌐 SHU YERDA (saytda) ]   → /yangi?qr=<code>  (mahalla avtotanlangan)
[ ✈️ TELEGRAM ORQALI    ]   → t.me/<bot>?start=qr_<code>
```

Plakat (admin generatsiya qiladi, A4 PDF): tepada gerb + "Muammoingiz bormi? Telefoningizda xabar bering!", markazda ulkan QR, ostida 3 qadam rasm bilan, pastda ishonch telefoni. Matn uz(lotin)+uz(kirill) aralash — qishloqda kirill o'quvchilar ko'p.

## 8. Accessibility checklist (F5.1 da tekshiriladi)

- [ ] Kontrast ≥ 4.5:1 (accent oltin #c9a227 oq fonda matn uchun YETARLI EMAS — matnga faqat to'q ranglar; oltin faqat fon/tugma fonida to'q matn bilan)
- [ ] Hamma interaktiv element klaviaturadan yetadi, focus ko'rinadi
- [ ] `lang` atributi locale bo'yicha; rasmlar alt bilan
- [ ] 200% zoom'da layout buzilmaydi; 320px enda gorizontal skroll yo'q
- [ ] Forma inputlarida label bor (placeholder label EMAS)
- [ ] prefers-reduced-motion hurmat qilinadi (animatsiyalar o'chadi)

## 9. i18n eslatmalari

- O'zbek kirill (`oz`) — ayniqsa keksa avlod uchun MUHIM; til tanlagich landing'da darhol ko'rinadi va tanlov eslab qolinadi.
- Sana/vaqt: `24-iyul, 09:30` formati (Asia/Tashkent), ruscha locale'da `24 июля`.
- SMS shablonlari fuqaro tilida ketadi (backend `citizens.language`).
- Matn uzunligi: kirill/rus tarjimalar lotindan ~15% uzun — tugma matnlari sig'ishi tekshiriladi.
