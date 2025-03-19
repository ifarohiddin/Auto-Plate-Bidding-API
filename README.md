# Auto Plate Bidding API

Bu loyiha FastAPI yordamida avto raqamlar uchun auktsion platformasi sifatida REST API yaratadi.

## O‘rnatish
1. Virtual muhit yarating: `python -m venv venv`
2. Faollashtiring: `venv\Scripts\activate` (Windows) yoki `source venv/bin/activate` (Linux/Mac)
3. Kutubxonalarni o‘rnating: `pip install -r requirements.txt`
4. Serverni ishga tushiring: `uvicorn main:app --reload`

## Railway’ga Deploy Qilish
1. Loyihani GitHub repositoriyasiga yuklang.
2. Railway’da yangi loyiha yarating va GitHub repositoriyasini ulang.
3. Deploy tugmasini bosing va loglarni tekshiring.

## Endpoint’lar
- `POST /login/`: JWT token olish
- `GET /plates/`: Faol raqamlar ro‘yxati
- `POST /bids/`: Taklif qilish