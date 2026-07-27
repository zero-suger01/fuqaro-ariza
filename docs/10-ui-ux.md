# 10 — UI/UX: soddalik qonunlari va ekran spetsifikatsiyalari

Bosh foydalanuvchi obrazi: **Malohat opa, 72 yosh, qishloqda yashaydi, oddiy Android telefon, sekin internet, texnik so'z bilmaydi, ko'zi xiraroq.** Har dizayn qarori shu odam sinovidan o'tishi kerak: *"Malohat opa buni yordamisiz qila oladimi?"* Yo'q bo'lsa — qayta dizayn.

## 1. Ikki dunyo, ikki uslub

| | Fuqaro sahifalari (`/`, `/yangi`, `/holat`, `/go`) | Admin (`/admin/*`) |
|---|---|---|
| Layout | Sidebar YO'Q. Bitta ustun, markazda, max-width 640px | To'q petrol sidebar (`#0d3138`, §7.1) + jadval uslubi qoladi |
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

[  📝  MUROJAAT YUBORISH  ]        ← accent (majolika moviysi, §7.1), ulkan
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
- Video — rasm bilan bir joyda (`MediaPicker`).
- **Muammo turi tanlash YO'Q** (v1.8 da olib tashlandi). Avval bu yerda 22
  ta toifadan iborat select turardi. Sabablari: (1) **Tesler** — 22 ta
  byurokratik toifa aynan AI bartaraf qilishi kerak bo'lgan yuk, Malohat
  opa uchun toifa tanlash muammoni aytishdan qiyinroq edi; (2) tanlov
  amalda hech narsaga ta'sir qilmasdi — `app/worker.py` `category_id` ni
  baribir AI natijasi bilan qayta yozadi, ya'ni bu maydon faqat
  boshqaruv illyuziyasi edi. `category_code` kontraktda ixtiyoriy
  ([03](03-kontraktlar.md) §3.1), shuning uchun endi umuman yuborilmaydi.
  Noto'g'ri tasnifni tuzatish yo'li — admin tomonidagi **AI nazorati**
  sahifasi (§10.1), fuqaro emas.
- Shu bilan birga ovozni **oldindan** STT'ga yuborish ham olib tashlandi:
  u faqat shu select'ni oldindan tanlab qo'yish uchun ovoz faylini
  yuklab, 20 soniyagacha so'rov qilib turardi (transkript hech qachon
  ko'rsatilmasdi). Sekin qishloq internetida bu bekorga ketgan yuklama
  edi — haqiqiy STT baribir yuborilgandan keyin serverda ishlaydi.
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

## 7.1 Rang tizimi (v1.8 — kanonik)

> Bu bo'lim v1.8 da qo'shildi. Avval palitra hech qayerda yozilmagan edi:
> §3 «accent (oltin)» derdi, §8 `#c9a227` ni ko'rsatardi, kodda esa
> `#f49a51` turardi — uchtasi uch xil. Endi manba shu jadval,
> `frontend/src/app/globals.css` unga amal qiladi.

Palitra nomi — **«Ishkor»**, o'zbek me'morchiligidagi ishqor sirlangan koshin
rangidan. Manba ataylab loyihaning o'z dunyosidan olingan: koshin sirining
moviy-yashili, to'q petrol zamin va rasmiy muhrning latun yaltirog'i.

**Tuzilmaviy cheklov (did emas, muhandislik):** SLA'ga asoslangan tizimda amber
«ogohlantirish», qizil «muddat o'tdi» ma'nosini doimiy egallaydi — demak brend
rangi **iliq bo'la olmaydi**. Aks holda brend har doim signal bilan
raqobatlashadi (v1.7 gacha aynan shunday edi: accent 27°, warning 39°).

**Ikki qonun:**
1. **Rang = holat. Tuzilma = brend.** Brend to'q petrol sirt + tipografika +
   latun muhr bilan beriladi, yorqin accent bilan emas.
2. **Sovuq = normal, iliq = e'tibor.** Amber/qizil kamdan-kam uchraydi.

| Rol | Token | Light | Dark |
|---|---|---|---|
| Brend qobig'i (sidebar, fuqaro lentasi) | `--shell` | `#0d3138` | (o'zgarmaydi) |
| Muhr / aktiv menyu — **faqat to'q sirtda** | `--brass` | `#d9a83c` | (o'zgarmaydi) |
| Interaktiv (havola, tugma, focus) | `--accent` | `#0b6e7a` | `#4fc3d4` |
| **Accent ustidagi matn** (tugma yozuvi) | `--accent-contrast` | `#ffffff` | `#06232a` |
| Sarlavha va asosiy matn | `--text-primary` | `#12252a` | `#e8efef` |
| Hali hech kim tegmagan (`new`, `ai_processed`) | `--st-new` | `#6e6a66` | `#9aa3a3` |
| Bizda, harakatda (`assigned`, `accepted`, `in_progress`) | `--info` | `#1f5fbf` | `#6ba5f5` |
| To'siq — fuqaro javobi kutilmoqda (`need_info`) | `--warning` | `#b45309` | `#fbbf24` |
| Yakunlandi (`resolved`, `closed`) | `--success` | `#15803d` | `#4ade80` |
| Rad etildi (`rejected`) | `--danger` | `#be2233` | `#fb7185` |

Qoidalar:

1. **Latun faqat to'q sirtda.** Yorug' yuzada u amber ogohlantirish bilan
   chalkashardi, shuning uchun oq fonda umuman ishlatilmaydi.
2. **`--accent` hech qachon holat bildirmaydi** — u faqat interaktivlik.
3. **Iliq rang faqat ikkita:** amber va qizil. Yangi iliq rang = qoida buzilishi.
4. **Neytral shkala bitta** — fuqaro va admin bir xil ranglarda. `.theme-admin`
   faqat shrift va radius (zichlik) ni o'zgartiradi, rangni EMAS.
5. **Hick:** holat ranglari 7 tadan **4 ta + neytral** ga qisqartirildi. Rang
   «harakat kerakmi?» degan savolga javob beradi; aniq bosqichni yozuv va
   kanban ustuni aytadi. Avval `in_progress` va `need_info` **ΔE 0.0** (aynan
   bir xil), `new` va `assigned` esa 3° farq bilan turardi.
6. Har juftlik orasidagi perseptual masofa **ΔE ≥ 33.6**, har bir rang oq
   fonda **≥4.5:1**.
7. Rang hech qachon yolg'iz signal emas — yonida doim ikon yoki yozuv (§8).
8. **Tugma yozug'i har doim `--accent-contrast`, `text-white` EMAS.** `--accent`
   ikki vazifani bajaradi (matn rangi + tugma foni), dark rejimda u yorqin
   sirga aylanadi va oq yozuv 2.1:1 ga tushib ketardi.

### 7.2 Etkazish qonunlari (v1.8)

| Qonun | Qayerda qo'llanildi |
|---|---|
| **Hick** | Holat ranglari 7 → 4+neytral (§7.1 №5). Muhimlikda faqat «Yuqori»/«Kritik» rangli — murojaatlarning aksariyati `medium` va ular endi neytral. |
| **Fitts** | Barcha nishonlar ≥44×44px: sidebar menyusi mobil drawerda `py-3`, til tanlagich, tema tugmasi, «Murojaatlarim» (`sm` dan pastda yozuv yashirinib 40px ga tushib qolardi). |
| **Jakob** | Fuqaro sahifasida to'q identifikatsiya lentasi + muhr + idora nomi — davlat xizmatlari butun dunyoda shunday taniladi. Avval oddiy oq chiziq edi. |
| **Tesler** | 10 ta status backendda `status_simple` orqali 5 taga siqiladi; AI kategoriyani o'zi aniqlaydi — murakkablikni tizim yutadi, fuqaro emas. |
| **Proximity** | Sarlavha lentasida ikki aniq guruh: chapda KIM (muhr+nom+idora), o'ngda VOSITALAR (til / kabinet / tema), orasida ajratgich. Avval uchta bog'liq bo'lmagan vazifa bir xil oraliqda yonma-yon turardi. |

## 8. Accessibility checklist (F5.1 da tekshiriladi)

- [x] Kontrast ≥ 4.5:1 — §7.1 dagi HAR BIR rang matn sifatida oq fonda
      5.0–7.4:1 oralig'ida (v1.8). Avval `--accent` 2.2:1, `--warning` 2.2:1,
      `--success` 3.4:1 edi, ya'ni uchtasi AA dan o'tmasdi.
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

## 10. Admin menyu va operatsion bosh ekran (v1.4)

> Bu bo'lim S1 da qo'shildi. Avval admin menyu tuzilmasi hech qayerda ta'riflanmagan edi — faqat §1 dagi «navy sidebar qoladi» jumlasi bor edi, real tarkib esa task izohlarida tarqoq yotardi.

### 10.1 Bosh ekran = navbat, statistika emas

Admin bosh ekranining yagona savoli: **«hozir qaysi ishni olish kerak?»**. Grafiklar va o'sish ko'rsatkichlari — haftalik tahlil vositasi, ular `/admin/kpi` da yashaydi.

Yuqorida **5 ta action-card**, har biri bosilganda aynan o'sha ro'yxatni ochadi (raqam va ro'yxat bir xil shartda hisoblanadi — [03](03-kontraktlar.md) §5 `stats/queues`):

| Card | Nimani ko'rsatadi | Bosilganda |
|---|---|---|
| Biriktirilmagan | bo'limi yoki egasi yo'q, terminal emas | `?queue=unassigned` |
| AI istisnolari | `needs_review=true` + `stuck_ai` | `/admin/tasdiqlash` |
| Muddat tugayapti | muddatning ≥75% o'tgan, hali overdue emas | `?queue=sla_risk` |
| Muddati o'tgan | `deadline_at < now`, terminal emas | `?queue=overdue` |
| Ma'lumot kutilmoqda | `need_info` da 24 soatdan ko'p | `?queue=need_info` |

Qoidalar: nol bo'lgan karta **muted** (bosiq) holatda — bo'sh navbat diqqatni tortmasin; noldan katta `overdue` va `stuck_ai` doim `danger` rangida; rang bilan birga ikon/yozuv ham bo'ladi (§8 — faqat rangga tayanilmaydi).

Ostida **bo'lim jadvali**: `Bo'lim | Yangi | Ijroda | Muddat tugayapti | Muddati o'tgan | Egasiz | Yuklama`. «Yuklama» — aktiv ish soni va `wip_limit` (oshgani belgilanadi, bloklanmaydi). Bu — rahbarning «qaysi bo'lim qoqilib qoldi» ekrani.

`AiHealthStrip` tepada qoladi — `pending_analysis` va `llm_errors_1h` operatsion uzilish signali, statistika emas.

### 10.2 Menyu — 5 guruh

Tekis 9 elementli ro'yxat kunlik ish uchun shovqin edi: `QR kodlar` va `Kategoriyalar` `Murojaatlar` bilan bir qatorda turardi. Guruhlar:

```
Operatsion navbat  Bosh ekran · Navbatim · Biriktirilmagan · AI nazorati · Muddat tugayapti ·
                   Muddati o'tgan · Ma'lumot kutilmoqda · Barcha murojaatlar
Monitoring         KPI · Xarita
Sozlamalar         Bo'limlar · Xodimlar · Kategoriyalar
Vositalar          QR kodlar · Audit log
```

Qoidalar: guruh sarlavhasi bosilmaydi (faqat yorliq); rol filtri **element va guruh** darajasida — barcha elementi yashiringan guruh umuman render qilinmaydi (`department_staff` faqat `Navbatim` + `Murojaatlar` ni ko'radi); navbat elementlari yonida jonli hisoblagich (0 bo'lsa hisoblagich ko'rsatilmaydi); mobil (<1024px) — hamburger + drawer (`F1.8`).

> **«SLA» so'zi interfeysda ishlatilmaydi (v1.8).** Xodim uchun u tushunarsiz
> qisqartma edi. Ko'rinadigan matnlarda o'zbekcha atama:
>
> | Ilgari | Endi |
> |---|---|
> | SLA xavfi | **Muddat tugayapti** |
> | SLA % (KPI) | **Muddatida %** |
> | SLA ogohlantirishi (event) | **Muddat haqida ogohlantirish** |
> | Javob muddati (SLA, soat) | **Javob muddati (soat)** |
>
> «Muddat tugayapti» ataylab yonidagi «Muddati o'tgan» bilan bir o'zakda —
> ikkisi ketma-ket bosqichdek o'qiladi. Kod ichidagi nomlar (`sla_risk`,
> `sla_hours`, `sla_warning`) O'ZGARMAYDI: ular kontrakt/API atamalari
> ([03](03-kontraktlar.md) §5) va ularni o'zgartirish sxemani buzardi.

> **`Murojaatlar` guruhi yo'q (v1.8).** «Barcha murojaatlar» `Operatsion
> navbat` guruhining oxiriga ko'chdi. Sabab: o'lik «Eksport» elementi
> olib tashlangach guruhda bitta element qolib, sarlavha ortiqcha shovqin
> bo'lib qoldi. Proximity bo'yicha joyi ham aynan shu yer — yuqoridagi
> navbatlarning aksariyati AYNAN shu sahifaning filtrlangan ko'rinishlari
> (`?queue=...`). Tartibi oxirida: avval «nima harakat talab qiladi»,
> keyin «yoki hammasini ko'rish».

> **Eksport menyuda YO'Q va qayta qo'shilmasin (v1.8).** Avval `Murojaatlar`
> guruhida `Eksport` elementi bor edi va `?export=1` ga borardi — lekin bu
> parametrni sahifa hech qachon o'qimasdi, ya'ni bosilganda aynan bir xil
> ro'yxat qayta ochilardi. Menyu elementi manzil bo'lishi kerak (Jakob);
> bu esa o'lik boshqaruv edi. Eksport ro'yxat sahifasidagi tugma bo'lib
> qoladi (F4.3) — u **joriy filtrlarni** hisobga oladi, ya'ni xodim ko'rib
> turgan kesimni aynan yuklab oladi; alohida sahifa buni qaytadan
> sozlashni talab qilardi. Bu §10.1 dagi umumiy qoidaga ham mos: bosh
> ekran va menyu — kunlik operatsion ish uchun, hisobot vositalari uchun
> emas.

> **Navbat ko'rinishi = zich ro'yxat, kanban EMAS (v1.9).** To'rttala
> navbat elementi ham `/admin/murojaatlar` ning `?queue=...` ko'rinishi —
> bitta komponent. Ular bir-biridan ajralib turishi uchun **ikki qoida**:
>
> 1. **Navbatda kanban ko'rsatilmaydi.** Kanban `status` bo'yicha
>    guruhlaydi, navbat filtrlari esa backendda terminal statuslarni
>    butunlay chiqarib tashlaydi (`queues.py::_active()`). Ya'ni
>    «Yakunlangan» ustuni `unassigned`/`sla_risk`/`overdue` da hech qachon
>    to'lmaydi — bu tasodif emas, kafolat. O'lchov (dev baza, 2026-07-27):
>    Biriktirilmagan 20/0/0, Muddat tugayapti 18/0/0, Muddati o'tgan
>    19/1/0 — ekranning 2/3 qismi doimiy bo'sh quti edi. Navbatda
>    sarlavha qatorli zich ro'yxat: `Murojaat · Holat · Muhimlik · Mas'ul
>    · Muddat · Bo'lim` (≥`xl`; undan pastda yorliqli blok). Kanban
>    «Barcha murojaatlar» da qoladi.
> 2. **Tartib navbatga bog'liq** — ta'rifi va o'lchovi:
>    [03](03-kontraktlar.md) Changelog v1.9. Bu ko'rinish emas, xulq-atvor
>    farqi: usiz to'rttala navbat bir xil «eng yangisi yuqorida» ro'yxati
>    bo'lib qolardi.
>
> Ochiq qolgan: navbatga xos amal (masalan Biriktirilmagan'da qator
> ustidan «Biriktirish») hali yo'q — hozircha har qator faqat tafsilotga
> olib boradi.

> **Bosqich tablari va ixcham filtr (v1.9).** Kanban butunlay olib
> tashlandi, «Barcha murojaatlar» esa 4 ta tabga bo'lindi: **Hammasi ·
> Yangi · Ijroda · Yakunlangan**.
>
> 1. **Tab — SERVER filtri** (`?stage=`), UI guruhlash emas. Kanban faqat
>    joriy sahifani (20 ta yozuv) guruhlagani uchun ustun raqamlari
>    yolg'on edi: bazada 96/2/21 bo'lgani holda ekranda «20/0/0»
>    ko'rinardi. Sonlar `GET /complaints/stage-counts` dan keladi va
>    boshqa faol filtrlarni hisobga oladi. «Hammasi» tabi SHART — kanban
>    uchala guruhni birdaniga ko'rsatardi, usiz bu imkoniyat yo'qolardi.
>    Bosqich→status xaritasi faqat serverda ([03](03-kontraktlar.md) §5).
> 2. **Aniq holat tanlansa tab «Hammasi» ga qaytadi** — ular bir
>    o'lchovning ikki darajasi; birga qoldirilsa «Yakunlangan tab +
>    Qabul qilindi holati» kabi zid juftlik hosil bo'lib, foydalanuvchi
>    sababi ko'rinmaydigan bo'sh ro'yxatga qarardi.
> 3. **Filtr paneli yopiq holatda.** Avval doim ochiq karta ~250px, ya'ni
>    kontent maydonining ~30% ini egallardi va to'rttala navbat
>    ko'rinishida bir xil takrorlanardi. Endi bitta qator (qidiruv +
>    tugma) ≈ jami 139px (o'lchandi: maydonning ~8% i), qolgani tugma
>    ostidagi popoverda. Yoqilgan filtrlar **o'chiriladigan chip** bo'lib
>    ko'rinadi — panelni ochmasdan nima faol ekani bilinadi (avval buni
>    faqat «Faol filtr yo'q» yozuvidan taxmin qilish mumkin edi).
> 4. Tab indikatori `sm` dan boshlab suriladi (sof CSS transform, DOM
>    o'lchash yo'q); 375px da 4 ta teng ustunga «Yakunlangan» sig'magani
>    uchun mobil ko'rinish gorizontal siljiydigan qatorga o'tadi.

> **Navbatim va AI nazorati ham shu uslubda (v1.9).** Umumiy komponentlar:
> `components/admin/ComplaintList.tsx` (zich qator) va
> `components/admin/SegmentedTabs.tsx` (tab).
>
> - **Navbatim** — uch ustunli kanban o'rniga 4 ta tab: *Bo'lim navbati ·
>   Qabul qilganlarim · Ijrodagi ishlarim · Ma'lumot kutilmoqda*. Har tab
>   alohida server so'rovi, son esa serverning `total` i. Avval sahifa
>   BITTA `page_size=100` so'rovi bilan (status filtrisiz!) olib, faol
>   ishni ham, guruhlashni ham, saralashni ham mijozda qilardi — bo'limda
>   100 tadan ko'p murojaat bo'lsa faol ishning bir qismi ro'yxatga
>   umuman tushmasdi va buni hech narsa bildirmasdi. Kesib qolingani endi
>   ochiq yoziladi («Ko'rsatildi: N / M»).
> - **Ustunlar sozlanadi** (`ComplaintColumn[]`). Navbatimda `Bo'lim` doim
>   xodimning o'z bo'limi, `Mas'ul` esa doim o'zi yoki «yo'q» — har
>   qatorda bir xil qiymat, nol axborot; shuning uchun ko'rsatilmaydi.
>   Status tabning o'zi bilan belgilangan tablarda `Holat` ham olib
>   tashlanadi.
> - **Muddat navbatlarda nisbiy** («3 soat qoldi», «2 kun kechikdi») —
>   absolute sana shoshilinchlikni ko'rsatmaydi, xodim boshida ayirma
>   hisoblardi. «Mening ishlarim» server tomonida ham muddat bo'yicha
>   tartiblanadi (`queues.ordering(mine=True)`).
> - **AI nazorati** — tab QO'YILMAYDI va zich jadvalga aylantirilmaydi:
>   bu ko'rish emas, AMAL sahifasi (har qatorda «To'g'ri»/«To'g'irlash»
>   va ochiladigan tahrir formasi). Faqat idish umumiylashtirildi —
>   alohida kartalar o'rniga bitta bo'lingan ro'yxat + jami son.

### 10.3 Tafsilot sahifasidagi o'zgarishlar

- **«Qabul qilaman»** — Holat kartasidagi asosiy tugma, faqat `assigned` va o'z bo'limi bo'lganda. Sahifani ochishning o'zi endi hech narsani o'zgartirmaydi ([03](03-kontraktlar.md) §2.1).
- **Mas'ul xodim** Holat kartasida doim ko'rinadi: ism yoki «Egasi yo'q».
- **«Ma'lumot kutilmoqda»** tugmasi sabab textarea'sini ochadi (rad etish naqshida) — bo'sh matn bilan yuborilmaydi. Bu matn fuqaroga SMS'da va `/holat` sahifasida ko'rinadi.
- **«Fuqaro javoblari»** kartasi: `citizen_messages` ro'yxati (kanal belgisi bilan — web/Telegram/manual) va manual kiritish formasi «Fuqaro telefonda aytdi...».

### 10.4 `/holat` — fuqaro javob qaytaradi

`need_info` holatida statik banner o'rniga **haqiqiy forma**: xodimning savoli katta matn bilan, ostida `Textarea` + rasm biriktirish + bitta katta tugma. §2 qoidalari to'liq amal qiladi (matn ≥18px, tugma ≥56px, bitta ekran — bitta savol, xatolar maydon yonida). Yuborilgandan keyin — tasdiq ekrani va murojaat avtomatik «Ijroda» ga qaytgani haqida sodda jumla.

`yakunlandi` bosqichida: **«Muammo hal bo'ldimi?» [Ha] [Yo'q]** ([03](03-kontraktlar.md) §3.6). «Yo'q» → qisqa izoh maydoni, murojaat qayta ochiladi. Bu — fuqaro uchun yagona e'tiroz kanali, shuning uchun u ko'rinmas joyda turmasin.
