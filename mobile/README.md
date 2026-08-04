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
