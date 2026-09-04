# النظارة الذكية للصم والبكم (React PWA + FastAPI)

تطبيق ويب Mobile-First يحاكي نظارة ذكية:
- **استقبال:** مايك → WebSocket/REST → faster-whisper → نص AR
- **إرسال:** كاميرا → MediaPipe Hands → ArSL (HuggingFace) → TTS
- **أمان:** YAMNet → تنبيه بصري + اهتزاز

## التشغيل

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000
```

أول تشغيل يحمّل نماذج Whisper / ArSL / YAMNet (قد يأخذ دقائق).

اختبار: http://localhost:8000/health  
المتوقع تقريباً: `"whisper": true, "arsl_engine": "torch+hf", "yamnet": true`

### Frontend
```bash
cd web
npm install
npm run dev
```

من الجوال: افتح عنوان Vite، وفي **الإعدادات** ضع `http://IP-الجهاز:8000`.

## مسارات API

| المسار | الوصف |
|---|---|
| `GET /health` | صحة الخدمة وحالة النماذج |
| `POST /stt` | ملف صوت → نص عربي |
| `WS /ws/stt` | بث قطع صوت حية |
| `GET /arsl/vocab` | مفردات الديمو العشر |
| `POST /arsl/predict` | landmarks 21×3 → كلمة |
| `POST /ambient` | تصنيف صوت البيئة / خطر |

## مفردات ArSL

ينام، يسكت، حب، يدخن، دعم→مساعدة، مرتبك، قلق، هنا، السلام عليكم، شكراً

## سيناريو فيديو الديمو

انظر [DEMO_SCRIPT.md](DEMO_SCRIPT.md).

## البناء
```bash
cd web && npm run build && npm run preview -- --host
```
