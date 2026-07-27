# 14 — Davlat tashkilotlari matritsasi (LLM klassifikator manbasi)

> Manba: hokimlik bergan «LLM classifier uchun aniq strukturaga ega bo'lgan
> davlat tashkilotlari matritsasi» (2026-07-27). Bu fayl — o'sha hujjatning
> repodagi kanonik nusxasi. **Kategoriya yoki bo'lim o'zgartirilsa avval shu
> yerga yoziladi**, keyin `backend/app/seed.py` ga.

## 1. Asosiy qoida: kategoriya = mas'ul tashkilot (1:1)

v1.8 gacha kategoriyalar **mavzuli** edi va bittasi bir nechta tashkilotni
qamrardi. Eng og'rig'i `yol_transport`: uning ichida yo'l ta'miri
(Yo'llar qo'mitasi), svetofor (YHXX) va avtobus grafigi (Transport
boshqarmasi) bor edi — uchta turli mas'ul. LLM mavzuni to'g'ri topsa ham
murojaat noto'g'ri idoraga tushardi, va bu bazadagi murojaatlarning
**yarmiga** (117 tadan 59 tasi) tegishli edi.

Endi har kategoriya aynan bitta tashkilotga tegishli: LLM kategoriya
tanlashi = mas'ul tashkilotni tanlashi. Oradagi noaniqlik yo'q.

## 2. Matritsa

### 2.1 Kommunal xizmatlar va uy-joy

| Kategoriya | Tashkilot | Javobgarlik |
|---|---|---|
| `elektr` | Hududiy elektr tarmoqlari (Elektroset) | Svet o'chishi, kuchlanish, transformator, yuqori kuchlanishli sim, hisoblagich/billing. **Mahalla ichidagi ko'cha va uy yoritishi ham shu yerda** (§3) |
| `gaz` | Hududgazta'minot | Gaz o'chishi, bosim, quvurdan sizish (gaz hidi — `critical`), ballon grafigi, hisoblagich |
| `suv_kanalizatsiya` | Suvta'minot (Suvsoz) | Ichimlik suvi, bosim, quvur yorilishi, kanalizatsiya tiqilishi, ochiq lyuk, suv sifati |
| `obodonlashtirish` | Obodonlashtirish boshqarmasi | **Katta ko'cha va yo'l bo'ylaridagi yoritish** (§3), ko'chalarni supurish, ariq va kollektor tozalash, daraxt butash |
| `chiqindi` | «Toza hudud» sanitar tozalash | Maishiy chiqindi grafigi, konteyner yo'qligi/to'lishi, nohaq qarzdorlik |
| `uy_joy` | Uy-joy inspeksiyasi (BHK nazorati) | Tom oqishi, podval, lift, BHK/Shirkat noqonuniy harakati, noqonuniy qayta rejalashtirish |

### 2.2 Yo'l, transport va infratuzilma

| Kategoriya | Tashkilot | Javobgarlik |
|---|---|---|
| `yol` | Avtomobil yo'llari qo'mitasi | Chuqur (yama), asfalt, yo'l ta'miri, trotuar, ko'prik |
| `yol_harakati` | Yo'l harakati xavfsizligi xizmati (YHXX) | Svetofor, yo'l belgisi, razmetka, kamera/radar |
| `jamoat_transporti` | Transport boshqarmasi | Avtobus/marshrutka grafigi, bekat holati, yo'l haqi |

### 2.3 Ekologiya, yer va qurilish

| Kategoriya | Tashkilot | Javobgarlik |
|---|---|---|
| `ekologiya` | Ekologiya inspeksiyasi | Noqonuniy daraxt kesish, havoga tutun/zaharli gaz, noqonuniy chiqindixona, suvga oqova |
| `yer_kadastr` | Kadastr agentligi | Yer chegarasi nizolari, ro'yxatga olish va texnik pasport, yerni noqonuniy egallash |
| `qurilish` | Qurilish inspeksiyasi | Ruxsatnomasiz qurilish, qurilishda xavfsizlik/sanitariya, qo'shniga zarar |

### 2.4 Ijtimoiy soha, sog'liq va ta'lim

| Kategoriya | Tashkilot | Javobgarlik |
|---|---|---|
| `sogliqni_saqlash` | Tuman tibbiyot birlashmasi (sanepid bilan) | Tibbiy xizmat sifati, bepul dori, tez yordam (103), oziq-ovqat zaharlanishi va obyekt sanitariyasi |
| `talim` | Maktabgacha va maktab ta'limi bo'limi | Noqonuniy pul yig'imlari, ta'lim sifati, xodim xatti-harakati, isitish va moddiy ahvol |
| `ijtimoiy_yordam` | «Inson» ijtimoiy xizmatlar markazi | Ijtimoiy daftarlar, bolalar nafaqasi, nogironlik (TMEK) va reabilitatsiya vositalari |

### 2.5 Jamoat tartibi, huquq va xavfsizlik

| Kategoriya | Tashkilot | Javobgarlik |
|---|---|---|
| `jamoat_xavfsizlik` | Ichki ishlar bo'limi (IIB) | Jamoat tartibi, tunda shovqin, mushtlashuv/o'g'rilik, pasport-ID va propiska, profilaktika inspektori |
| `favqulodda` | Favqulodda vaziyatlar bo'limi | Yong'in va yong'in xavfi, sel/ko'chki/ustun ag'darilishi, binoning yong'in xavfsizligi |
| `ijro` | Majburiy ijro byurosi (MIB) | Sud qarori ijrosi, aliment va qarz undirish, asossiz taqiq (zapret), inspektor harakatlari |

### 2.6 Iqtisodiyot, soliq va mehnat

| Kategoriya | Tashkilot | Javobgarlik |
|---|---|---|
| `soliq` | Davlat soliq inspeksiyasi | QR-chek berilmasligi, noqonuniy tadbirkorlik, mol-mulk/yer solig'i, E-ijara |
| `mehnat` | Bandlik va mehnat inspeksiyasi | Ish haqi kechikishi, noqonuniy ishdan bo'shatish, shartnomasiz ishlatish, xavfsizlik texnikasi |
| `isteomolchi` | Raqobat va iste'molchilar huquqlari bo'limi | Sifatsiz mahsulot, narxni sun'iy oshirish, tarozidan urish, yolg'on reklama |

### 2.7 Mahalliy hokimiyat va mahalla

| Kategoriya | Tashkilot | Javobgarlik |
|---|---|---|
| `hokimlik` | Tuman hokimligi | **Hech qaysi tashkilotga aniq tushmaydigan** kompleks muammolar, infratuzilma/investitsiya, sektor rahbarlari |
| `mahalla` | Mahalla fuqarolar yig'ini (MFY) | Mahallalararo va oilaviy nizolar, hokim yordamchisi, yoshlar yetakchisi, xotin-qizlar faoli |

## 3. Ko'cha yoritilishi — chegara (hokimlik aniqlashtirgan)

Matritsa yoritishni to'liq `obodonlashtirish` ga bergan, lekin hokimlik
amaliyotda chegarani boshqacha qo'ydi va **shu qoida amal qiladi**:

| Nima | Kim |
|---|---|
| **Mahalla ichidagi** ko'chalar va uylar — «ko'chamizda / mahallamizda / uyimizda svet yo'q» | `elektr` (Elektroset) |
| **Mashina yuradigan katta ko'cha va yo'l bo'ylari** — ustunlar, tungi yoritish | `obodonlashtirish` |

Bu chegara ikkala kategoriya izohida yozilgan va sinovdan o'tgan (§5).

## 4. Nofaol qilinganlar

Matritsada yo'q kategoriya va bo'limlar **o'chirilmadi**, `is_active=False`
qilindi: mavjud 117 ta murojaat ularga FK bilan bog'langan va tarix
saqlanishi kerak. Nofaol yozuv LLM promptiga tushmaydi va yangi murojaat
unga yo'naltirilmaydi, lekin eski murojaatda to'g'ri ko'rinadi.

Kategoriyalar: `chiqindi_obodon`, `yol_transport`, `uy_kommunal`,
`qurilish_arxitektura`, `soliq_moliya`, `yongin_xavfsizligi`,
`bandlik_mehnat`, `fhdyo_hujjatlar`, `qishloq_xojaligi`,
`telekommunikatsiya`, `huquqiy_masalalar`, `taklif_tashabbus`, `boshqa`.

Bo'limlar: `kommunal`, `fhdyo`, `qishloq_xojaligi`, `telekom`, `huquq`.

> **`boshqa` -> `hokimlik`.** Standart kategoriya (`DEFAULT_CATEGORY_CODE`,
> intake paytida va LLM noma'lum kod qaytarganda) endi `hokimlik`. Avvalgi
> `boshqa` nomi bo'yicha «bilmadim» qutisiga o'xshardi va hech kimga
> biriktirilmagandek tuyulardi — matritsa §7 esa mas'ulni aniq ko'rsatadi.
>
> **FHDYO (ZAGS) matritsada yo'q.** Pasport/ID va propiska IIB ga berilgan,
> tug'ilish/nikoh guvohnomalari esa umuman ta'riflanmagan. Hozircha bunday
> murojaat `hokimlik` ga tushadi. Agar tumanda ZAGS alohida qabul qilsa —
> matritsaga qo'shilishi kerak.

## 5. Sinov natijasi

deepseek-v4-flash, matritsadan olingan 24 ta tipik murojaat matni —
**24/24 to'g'ri tashkilotga** yo'naltirildi. Jumladan §3 chegarasi:

| Matn | Natija |
|---|---|
| «mahallamizda 3 kundan beri svet yo'q» | `elektr` |
| «ko'chamizdagi chiroqlar yonmayapti, mahalla ichida qorong'i» | `elektr` |
| «mashina yuradigan katta ko'cha bo'ylab tungi yoritish ishlamayapti» | `obodonlashtirish` |
| «asfaltda katta chuqur bor» | `yol` |
| «maktab oldidagi svetofor o'chib qoldi» | `yol_harakati` |

Sinovni qayta yurgizish: izohlarni `app/seed.py: CATEGORY_DESCRIPTIONS` da
tahrirlab `python -m app.seed`, so'ng matnlarni `analyze_with_llm` orqali
o'tkazish. **Yo'naltirishni sozlash kod emas, seed tahriri.**

## 6. Manba hujjatidagi kodlash nuqsoni

Asl `.docx` da `'r` ketma-ketligi ba'zi joyda ` me'yor` ga aylanib ketgan
(«noto'g me'yoriy» = «noto'g'ri», «ishdan bo me'yorish» = «ishdan
bo'shatish», «ichki ko me'yoriy ko'chalar» = «ichki ko'chalar»). Bu yerga
ma'nosi tiklangan holda ko'chirildi.
