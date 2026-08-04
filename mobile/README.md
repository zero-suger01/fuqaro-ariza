# e-Murojaat mobile

Expo + React Native fuqaro ilovasi. Mavjud `/api/public` kontraktlaridan foydalanadi.

```bash
cd mobile
npm install
cp .env.example .env
# Production API allaqachon sozlangan: https://ariza.xron.uz
# Faqat lokal backend ishlatsangiz EXPO_PUBLIC_API_URL ni LAN IP ga almashtiring.
npx expo start
```

Lokal backend bilan ishlaganda telefon va kompyuter bir Wi-Fi tarmog‘ida bo‘lishi kerak. Backend ham LAN’dan tinglashi kerak:

```bash
cd backend
venv311/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001
```

Android emulator uchun odatda `http://10.0.2.2:8001`, iOS simulator uchun `http://127.0.0.1:8001` ishlatiladi. Expo Go’da push notification ishlamaydi; push uchun development build kerak.

---

## Dizayn tizimi — "Registon"

Butun UI `src/design/` ostidagi bitta tizimdan quriladi. Ekranlarda `StyleSheet` ichida
xom rang, o‘lcham yoki soya yozilmaydi — hammasi token orqali keladi.

```
src/design/
  tokens.ts          rang, oraliq, radius, tipografika, soya, motion
  status.ts          murojaat holatlari: rang, ikonka, jarayon ulushi
  primitives/        Txt, Touchable, Card, NightPanel, Glass, Button,
                     Field, Chip, Badge, Reveal, Drift, CountUp,
                     Skeleton, ProgressRing, ProgressRail
  motifs/            o‘zbek naqshlari (SVG)
```

### Rang tili

Palitra Temuriylar me’morchiligidan olingan, generic "davlat ko‘ki" emas:

| Token | Manba |
| --- | --- |
| `primary` (turkuaz) | Shohi Zinda gumbazlari |
| `night` (lojuvard) | Registon peshtoqlari |
| `accent` (guruch/oltin) | muqarnas zarhali |
| `canvas` (iliq fil suyagi) | Samarqand qog‘ozi |
| `danger` (anor) | rad etilgan murojaatlar |

Ilova bitta yorug‘ mavzuga qurilgan; chuqurlik esa `NightPanel` — qorong‘i
gradiyent yuzalar orqali beriladi (`app.json` da `userInterfaceStyle: light`).

### Naqshlar

`src/design/motifs/geometry.ts` ichidagi barcha shakllar hisoblab chiqariladi,
qo‘lda chizilmaydi — masalan, sakkiz burchakli girih yulduzi haqiqiy `{8/3}`
yulduz ko‘pburchagi.

- `GirihField` — panjara: sakkizburchak + yulduz katakchasi, takrorlanuvchi fon
- `SuzaniBloom` — palak medalyoni (Buxoro so‘zanasi)
- `IkatBand` / `GildedRule` — abrbandi lentasi va bo‘luvchi chiziq
- `EmblemMark` / `PakhtaMark` / `GirihStar` — brend belgisi, paxta, yulduz
- `StarLoader` — qarama-qarshi aylanuvchi ikki yulduz (yuklanish indikatori)

### Tipografika

Manrope (lotin + kirill). Og‘irlik **faqat** `fontFamily` orqali beriladi —
`fontWeight` Android’da soxta shrift hosil qiladi. Barcha matn `<Txt>` orqali.

### Harakat

`react-native-reanimated` (UI thread), `expo-haptics` bilan birga:

- `Touchable` — bosishda prujinali siqilish + haptik
- `Reveal` — sahifa bloklari ketma-ket chiqadi (uzun ro‘yxatda kechikish cheklangan)
- `CountUp`, `ProgressRing`, `ProgressRail` — raqam va jarayon animatsiyalari

### Tekshiruv

```bash
npm run typecheck && npm run lint
```

Vizual tekshiruv uchun `npx expo start --web` va 320px / 390px kengliklarda
to‘rt tilni ham ko‘rib chiqing — eng uzun matnlar rus tilida bo‘ladi.
