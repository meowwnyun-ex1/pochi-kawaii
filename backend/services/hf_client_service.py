import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class HuggingFaceClientService:
    def __init__(
        self,
        api_token: str,
        base_url: str,
        model: str,
        timeout: int = 60
    ):
        self.api_token = api_token.strip() if api_token else ""
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }

    async def generate_response(
        self,
        prompt: str,
        lang: str = "en",
        temperature: float = 0.85,
        max_tokens: int = 2048,
        top_p: float = 0.95
    ) -> Optional[str]:
        if not self.api_token:
            logger.error("HUGGINGFACE_API_TOKEN is missing or empty!")
            return None

        # Language-specific system messages
        lang_instructions = {
            "th": """คุณเป็น AI ผู้ช่วยด้านสุขภาพ ตอบเป็นภาษาไทยเป็นหลัก

⚠️ **สำคัญ:** ถ้าผู้ใช้ขอให้แปลหรือตอบเป็นภาษาอื่น (เช่น "แปลเป็นอังกฤษ", "ตอบเป็นสเปน") ให้ตอบตามที่ผู้ใช้ขอเลย ไม่ต้องยึดติดกับภาษาไทย

📊 **การสร้างกราฟและไฟล์:**
เมื่อผู้ใช้ขอให้สร้างกราฟ ตาราง หรือแผนภูมิ ให้ใช้รูปแบบนี้:

```html
<div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
  <h3 style="margin: 0 0 15px 0; font-size: 18px;">📊 ชื่อกราฟ</h3>
  <div style="background: white; padding: 15px; border-radius: 8px; color: #333;">
    <!-- เนื้อหากราฟ/ตาราง -->
  </div>
</div>
```

ตัวอย่างกราฟแท่ง:
```html
<div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
  <h3 style="margin: 0 0 15px 0;">📊 ข้อมูลสถิติ</h3>
  <div style="background: white; padding: 15px; border-radius: 8px;">
    <div style="display: flex; align-items: flex-end; justify-content: space-around; height: 200px; gap: 10px;">
      <div style="flex: 1; background: #4CAF50; height: 80%; border-radius: 4px 4px 0 0; position: relative;">
        <span style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); color: #333; font-weight: bold;">80</span>
        <span style="position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); color: #666;">ม.ค.</span>
      </div>
    </div>
  </div>
</div>
```""",
            "en": """You are a health AI assistant. Respond in English by default.

⚠️ **Important:** If the user asks to translate or respond in another language (e.g., "translate to Spanish", "respond in Thai"), respond in the requested language. Don't stick to English only.

📊 **Creating Charts and Files:**
When users request charts, tables, or graphs, use this format:

```html
<div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
  <h3 style="margin: 0 0 15px 0; font-size: 18px;">📊 Chart Title</h3>
  <div style="background: white; padding: 15px; border-radius: 8px; color: #333;">
    <!-- Chart/Table content -->
  </div>
</div>
```""",
            "ja": """あなたは健康AIアシスタントです。デフォルトで日本語で応答してください。

⚠️ **重要:** ユーザーが翻訳や他の言語での応答を求めた場合（例：「スペイン語に翻訳して」「タイ語で答えて」）、要求された言語で応答してください。日本語のみにこだわらないでください。

📊 **グラフとファイルの作成:**
ユーザーがグラフ、表、チャートを要求した場合、この形式を使用してください:

```html
<div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
  <h3 style="margin: 0 0 15px 0; font-size: 18px;">📊 グラフタイトル</h3>
  <div style="background: white; padding: 15px; border-radius: 8px; color: #333;">
    <!-- グラフ/表の内容 -->
  </div>
</div>
```"""
        }

        system_instruction = lang_instructions.get(lang, lang_instructions["en"])

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": top_p,
            "presence_penalty": 0.7,
            "frequency_penalty": 0.4,
            "stream": False
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    url=self.base_url,
                    headers=self.headers,
                    json=payload
                )

                if response.status_code == 200:
                    data = response.json()
                    result = data["choices"][0]["message"]["content"].strip()
                    logger.info(f"[HF] Success! Response length: {len(result)} chars")
                    return result

                elif response.status_code == 401:
                    logger.error("[HF] Invalid or revoked API token!")
                    return None

                elif response.status_code == 429:
                    logger.warning("[HF] Rate limited by Hugging Face")
                    return None

                else:
                    error = response.text[:300]
                    logger.error(f"[HF] HTTP {response.status_code}: {error}")
                    return None

        except Exception as e:
            logger.error(f"[HF] Request failed: {str(e)}")
            return None