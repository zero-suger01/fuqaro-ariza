# e-Murojaat mobile

Expo + React Native fuqaro ilovasi. Mavjud `/api/public` kontraktlaridan foydalanadi.

```bash
cd mobile
npm install
cp .env.example .env
# .env ichida kompyuterning LAN IP manzilini yozing, masalan:
# EXPO_PUBLIC_API_URL=http://10.247.122.52:8001
npx expo start
```

Telefon va kompyuter bir Wi-Fi tarmog‘ida bo‘lishi kerak. Backend ham LAN’dan tinglashi kerak:

```bash
cd backend
venv311/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001
```

Android emulator uchun odatda `http://10.0.2.2:8001`, iOS simulator uchun `http://127.0.0.1:8001` ishlatiladi. Expo Go’da push notification ishlamaydi; push uchun development build kerak.
