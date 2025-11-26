import json
import logging
import os
from pathlib import Path
from typing import Optional

from langdetect import detect as langdetect_detect, LangDetectException

logger = logging.getLogger(__name__)


class LanguageService:
    def __init__(self, ai_config_path: Optional[str] = None):
        """
        Initialize LanguageService with config files.

        Args:
            ai_config_path: Optional path to AI config file (overrides env var)
        """
        # Always use backend/config directory
        config_dir = Path(__file__).parent.parent / "config"

        # Determine AI config path
        if ai_config_path:
            ai_config_path = Path(ai_config_path)
            # If relative path, use filename only and look in config_dir
            if not ai_config_path.is_absolute():
                ai_config_path = config_dir / ai_config_path.name
        else:
            ai_config_file = os.getenv("AI_CONFIG_FILE", "ai_config.json")
            ai_config_path = config_dir / ai_config_file

        logger.info(f"🔍 [LanguageService] Loading config from: {ai_config_path}")
        self.ai_config = self._load_config_file(ai_config_path, "AI config")

        self.supported_languages = ["th", "en", "jp", "id", "zh", "ko", "vi", "es", "fil", "hi"]
        self.default_language = "th"
        self.medical_keywords = self.ai_config.get("medical_keywords", {})

    def _load_config_file(self, file_path: Path, description: str) -> dict:
        """
        Load a JSON config file with error handling.

        Args:
            file_path: Path to config file
            description: Description for logging

        Returns:
            Config dictionary or empty dict on failure
        """
        try:
            if file_path and file_path.exists():
                with open(file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            else:
                logger.warning(f"{description} file not found: {file_path}")
                return {}
        except Exception as e:
            logger.error(f"Error loading {description}: {e}")
            return {}

    def detect_language(self, text: str) -> str:
        """
        Detect language of input text with improved short-text handling
        """
        if not text or len(text.strip()) < 2:
            return self.default_language

        text_lower = text.lower().strip()
        english_patterns = [
            'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
            'thank you', 'thanks', 'please', 'help', 'what', 'when', 'where', 'why', 'how',
            'i have', 'i am', 'i feel', 'my', 'me', 'can you', 'could you', 'would you',
            'are you', 'do you', 'does', 'did', 'will', 'shall', 'should', 'would',
            'r u', 'u r', 'ur', 'how r u', 'how are', 'whats up', "what's", 'sup',
            'ok', 'okay', 'yes', 'no', 'yeah', 'nope', 'yep', 'sure', 'maybe',
            'the', 'is', 'was', 'were', 'been', 'being', 'have', 'has', 'had',
            'this', 'that', 'these', 'those', 'some', 'any', 'many', 'much',
            'good', 'bad', 'best', 'better', 'worse', 'worst', 'nice', 'fine',
            'sick', 'ill', 'pain', 'hurt', 'ache', 'tired', 'fever', 'cough',
            'doctor', 'medicine', 'health', 'symptom', 'disease', 'treatment'
        ]
        if any(pattern in text_lower for pattern in english_patterns):
            return 'en'

        if any(ord(char) >= 0x3040 for char in text):
            return 'jp'

        thai_char_count = sum(1 for char in text if 0x0E00 <= ord(char) <= 0x0E7F)
        if thai_char_count > 0:
            return 'th'

        try:
            detected = langdetect_detect(text)
            lang_map = {
                'id': 'id', 'zh-cn': 'zh', 'zh-tw': 'zh', 'ko': 'ko', 
                'vi': 'vi', 'es': 'es', 'tl': 'fil', 'hi': 'hi',
                'th': 'th', 'en': 'en', 'ja': 'jp'
            }
            lang = lang_map.get(detected, detected)
            if lang in self.supported_languages:
                return lang
            return self.default_language
        except (LangDetectException, Exception) as e:
            logger.debug(f"Language detection failed for text: {e}")
            if all(ord(char) < 128 for char in text.strip()):
                return 'en'

            return self.default_language

    def is_medical_question(self, text: str, lang: Optional[str] = None) -> bool:
        if lang is None:
            lang = self.detect_language(text)
        text_lower = text.lower()
        keywords = self.medical_keywords.get(lang, [])
        return any(keyword.lower() in text_lower for keyword in keywords)

    def get_translation(self, key: str, lang: str) -> str:
        """
        Get translation for a key in specified language.

        Args:
            key: Translation key
            lang: Language code (th, en, ja)

        Returns:
            Translated string or key if not found
        """
        config_dir = Path(os.getenv("CONFIG_DIR", ""))
        ui_config_file = os.getenv("UI_CONFIG_FILE", "ui_config.json")
        ui_config_path = config_dir / ui_config_file if config_dir else None

        ui_config = self._load_config_file(ui_config_path, "UI config")
        translations = ui_config.get("translations", {})

        if key in translations and lang in translations[key]:
            return translations[key][lang]

        return key