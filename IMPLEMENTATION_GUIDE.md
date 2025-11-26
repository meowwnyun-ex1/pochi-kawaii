# 🌸 Pochi! Kawaii ne~ - Implementation Guide

## การเปลี่ยนแปลงที่ทำเสร็จแล้ว ✅

### 1. **การตั้งค่าพื้นฐาน**
- ✅ เปลี่ยนชื่อโปรเจค: `Maemi-Chan` → `Pochi! Kawaii ne~`
- ✅ เปลี่ยน Port: Frontend `3004` | Backend `4004`
- ✅ เปลี่ยน Path: `/maemi-chan` → `/pochi-kawaii`
- ✅ เปลี่ยน AI Model: `Bio_ClinicalBERT` → `FLUX.1-dev` (Image Generation)

### 2. **ธีมสี - Pink Sakura Japanese Style**
- ✅ Primary Color: Soft Pink (#ffc0cb, #ffb6c1, #ff69b4)
- ✅ Background: Gradient Pink Pastel
- ✅ Theme: Kawaii + Sakura Japanese aesthetic
- ✅ Files Updated:
  - `frontend/src/index.css`
  - `frontend/tailwind.config.ts`

### 3. **Frontend Components**

#### **New Components Created:**

##### `ImageUpload.tsx`
```typescript
// Location: frontend/src/components/ImageUpload.tsx
// Features:
- Drag & Drop upload
- File validation (JPG, PNG, WEBP, max 10MB)
- Image preview
- Clear button
- Pink theme styling
```

##### **Updated Index.tsx**
```typescript
// Location: frontend/src/pages/Index.tsx
// Complete redesign from chat interface to image generation:
- Image upload section
- Generate button
- Processing animation
- Generated image display
- Download & Regenerate buttons
```

#### **Updated Components:**
- `Sidebar.tsx` - Pink theme, New Style menu
- `AppHeader.tsx` - Pink theme, updated branding

### 4. **Language Files Updated**
Updated 3 languages (TH, EN, JP):
- `sidebar.json` - New menu items, app name
- `chat.json` - Image generation text, error messages

### 5. **Backend Services Created**

#### **ChibiImageService**
```python
# Location: backend/services/chibi_image_service.py

Key Features:
- Fixed chibi prompt (always same style)
- Image validation & preprocessing
- HuggingFace FLUX.1-dev integration
- Base64 image handling
- Error handling
```

**Fixed Chibi Prompt:**
```
Create an adorable chibi-style cartoon character based on this photo.
Style requirements:
- Ultra cute kawaii chibi art style
- Large sparkling eyes with highlights
- Small simplified body proportions
- Soft pastel colors (pink, lavender, white)
- Japanese anime/manga aesthetic
- Rounded, simplified features
- Cheerful, friendly expression
- Clean lineart with soft shading
- White or soft pink background
- Professional digital illustration quality
```

#### **Generation Route**
```python
# Location: backend/routes/generate.py

Endpoints:
- POST /generate/chibi - Generate chibi image
- GET /generate/status - Check service status
```

---

## งานที่ต้องทำต่อ 📋

### 1. **อัพเดท backend/main.py**

เพิ่มโค้ดดังนี้:

```python
# เพิ่มการ import
from routes.generate import setup_generate_routes
from services.chibi_image_service import ChibiImageService

# เพิ่มหลัง line 104 (หลัง health_analytics_service)
chibi_service = ChibiImageService(
    api_token=config.huggingface_api_token,
    model_name=config.huggingface_model,
    base_url=config.huggingface_base_url,
    timeout=config.huggingface_timeout
)

# เปลี่ยนข้อความใน lifespan function (line 110)
logger.info(startup_msgs.get("starting", "🚀 Starting Pochi! Kawaii ne~ AI"))

# เปลี่ยน line 152
logger.info(f"🤖 HuggingFace AI: {config.huggingface_model} + Chibi Image Generation")

# ลบหรือ comment บรรทัดเกี่ยวกับ Medical Knowledge (line 141-146)

# เปลี่ยน line 166
logger.info(f"✅ Pochi! Kawaii ne~ ready on http://{config.server_host}:{config.server_port}")

# เพิ่มหลัง line 333 (หลัง setup_admin_routes)
setup_generate_routes(app, chibi_service)
```

### 2. **อัพเดท header language files**

#### `frontend/src/i18n/locales/th/header.json`
```json
{
  "appName": "Pochi! Kawaii ne~",
  "appSubtitle": "AI สร้างภาพการ์ตูนจิบิ",
  "feedbackButton": "ส่งความคิดเห็น"
}
```

#### `frontend/src/i18n/locales/en/header.json`
```json
{
  "appName": "Pochi! Kawaii ne~",
  "appSubtitle": "AI Chibi Cartoon Generator",
  "feedbackButton": "Feedback"
}
```

#### `frontend/src/i18n/locales/jp/header.json`
```json
{
  "appName": "Pochi! Kawaii ne~",
  "appSubtitle": "AIちびキャラ生成",
  "feedbackButton": "フィードバック"
}
```

### 3. **สร้างไฟล์ .env จาก .env.example**

```bash
# Copy .env.example to .env
cp .env.example .env

# แก้ไขค่าต่อไปนี้:
HUGGINGFACE_API_TOKEN=YOUR_ACTUAL_TOKEN_HERE
SERVER_PORT=4004
CORS_ORIGINS=http://localhost,http://localhost:3004,http://127.0.0.1
```

### 4. **Install Dependencies (ถ้ายังไม่ได้ทำ)**

```bash
# Backend
cd backend
pip install pillow httpx

# Frontend
cd frontend
npm install
```

---

## วิธีการรันระบบ 🚀

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 4004 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# จะรันที่ http://localhost:3004
```

### Production Build

**Build Frontend:**
```bash
cd frontend
npm run build
# Output: frontend/dist-new/
```

**Deploy:**
- Copy `frontend/dist-new/` → nginx `html/pochi-kawaii/`
- Configure nginx ให้ point ไปที่ path `/pochi-kawaii`

---

## API Endpoints 📡

### Image Generation
```
POST /generate/chibi
Content-Type: multipart/form-data

Body:
- file: Image file (JPG/PNG/WEBP, max 10MB)
- session_id: Optional session ID

Response:
{
  "image_url": "data:image/png;base64,...",
  "session_id": "uuid",
  "success": true,
  "message": "ภาพจิบิของคุณพร้อมแล้วค่ะ! 🌸"
}
```

### Check Status
```
GET /generate/status

Response:
{
  "available": true,
  "model": "black-forest-labs/FLUX.1-dev",
  "message": "Chibi generation service ready! 🎨"
}
```

---

## การทดสอบ 🧪

### 1. ทดสอบ Frontend (ไม่ต้องมี Backend)
- อัปโหลดรูปได้
- แสดง preview ถูกต้อง
- UI สีชมพูสวยงาม

### 2. ทดสอบ Backend
```bash
# ทดสอบว่า service พร้อม
curl http://localhost:4004/generate/status

# ทดสอบสร้างภาพ
curl -X POST http://localhost:4004/generate/chibi \
  -F "file=@test_photo.jpg" \
  -F "session_id=test123"
```

### 3. Integration Test
- อัปโหลดรูปบน UI
- กด Generate
- ดู processing animation
- รับภาพจิบิที่สร้างเสร็จ
- ดาวน์โหลดภาพ

---

## Known Issues & Solutions ⚠️

### Issue 1: "Model is loading"
**Solution:** รอ 1-2 นาที แล้วลองใหม่ (HuggingFace cold start)

### Issue 2: "Invalid API token"
**Solution:** ตรวจสอบ `HUGGINGFACE_API_TOKEN` ใน `.env`

### Issue 3: CORS Error
**Solution:**
- ตรวจสอบ `CORS_ORIGINS` ใน `.env`
- เพิ่ม `http://localhost:3004`

### Issue 4: Image too large
**Solution:** Resize image < 10MB ก่อนอัปโหลด

---

## File Structure 📁

```
pochi-kawaii/
├── backend/
│   ├── main.py (ต้องแก้)
│   ├── routes/
│   │   └── generate.py (✅ สร้างแล้ว)
│   └── services/
│       └── chibi_image_service.py (✅ สร้างแล้ว)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ImageUpload.tsx (✅ สร้างแล้ว)
│   │   │   ├── Sidebar.tsx (✅ อัพเดทแล้ว)
│   │   │   └── AppHeader.tsx (✅ อัพเดทแล้ว)
│   │   ├── pages/
│   │   │   └── Index.tsx (✅ Redesign แล้ว)
│   │   ├── i18n/locales/
│   │   │   ├── th/ (✅ อัพเดทแล้ว)
│   │   │   ├── en/ (✅ อัพเดทแล้ว)
│   │   │   └── jp/ (✅ อัพเดทแล้ว)
│   │   └── index.css (✅ Pink theme)
│   ├── vite.config.ts (✅ Port 3004)
│   └── tailwind.config.ts (✅ Sakura colors)
│
└── .env.example (✅ อัพเดทแล้ว)
```

---

## Next Steps 🎯

1. ✅ อัพเดท `backend/main.py` ตามคำแนะนำด้านบน
2. ✅ อัพเดทไฟล์ภาษา header (TH/EN/JP)
3. ✅ สร้างไฟล์ `.env` จาก `.env.example`
4. ✅ ใส่ HuggingFace API Token จริง
5. ✅ ทดสอบรันระบบ
6. ✅ ทดสอบสร้างภาพจิบิ
7. 🎉 Deploy to production!

---

## Credits 💝

- **Theme:** Kawaii Pink Sakura Japanese Style
- **AI Model:** HuggingFace FLUX.1-dev
- **Style:** Chibi Cartoon Character Generation
- **Fixed Prompt:** Ensures consistent cute chibi style for all users

---

**Made with 🌸 by Pochi! Kawaii ne~**
