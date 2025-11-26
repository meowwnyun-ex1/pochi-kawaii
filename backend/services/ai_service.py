import logging
import asyncio
from typing import Optional, Tuple
from pathlib import Path
import os
import json

from services.language_service import LanguageService
from services.learning_service import LearningService
from services.hf_client_service import HuggingFaceClientService
from services.file_processing_service import FileProcessingService

# Optional medical services - not required for chibi image generation
try:
    from services.medical_knowledge_service import MedicalKnowledgeService
    from services.medical_analytics_service import MedicalAnalyticsService
    MEDICAL_SERVICES_AVAILABLE = True
except ImportError:
    MEDICAL_SERVICES_AVAILABLE = False
    MedicalKnowledgeService = None
    MedicalAnalyticsService = None

logger = logging.getLogger(__name__)

MAX_PROMPT_LENGTH = 3003

class AIService:
    def __init__(
        self,
        hf_api_token: str,
        hf_base_url: str,
        hf_model: str,
        hf_timeout: int,
        database_manager,
        enable_learning: bool = True,
        learning_confidence: float = 0.85,
        similar_threshold: float = 0.90,
    ):
        self.enable_learning = enable_learning
        self.learning_confidence = learning_confidence
        self.similar_threshold = similar_threshold

        self.db = database_manager

        config_dir_str = os.getenv("CONFIG_DIR", "")
        if config_dir_str:
            config_dir = Path(config_dir_str)
        else:
            config_dir = Path(__file__).parent.parent / "config"

        ai_config_file = os.getenv("AI_CONFIG_FILE", "ai_config.json")
        api_config_file = os.getenv("API_CONFIG_FILE", "api_config.json")
        ai_config_path = config_dir / ai_config_file
        api_config_path = config_dir / api_config_file

        try:
            if ai_config_path and ai_config_path.exists():
                with open(ai_config_path, "r", encoding="utf-8") as f:
                    self.config = json.load(f)
            else:
                self.config = self._get_default_config()
        except Exception as e:
            logger.error(f"Error loading AI config: {e}")
            self.config = self._get_default_config()

        try:
            if api_config_path and api_config_path.exists():
                with open(api_config_path, "r", encoding="utf-8") as f:
                    api_config = json.load(f)
                self.log_msgs = api_config.get("log_messages", {})
            else:
                self.log_msgs = {}
        except Exception as e:
            logger.warning(f"Could not load API config: {e}")
            self.log_msgs = {}

        self.emergency_keywords = self.config["emergency_keywords"]
        self.illegal_content_keywords = self.config.get("illegal_content_keywords", {})
        self.emergency_numbers_th = self.config["emergency_numbers"]["th"]
        self.emergency_numbers_intl = self.config["emergency_numbers"]["intl"]
        self.symptom_patterns = self.config["symptom_patterns"]
        self.medical_keywords = self.config["medical_keywords"]
        self.greetings = self.config["greetings"]
        self.medical_indicators = self.config["medical_indicators"]
        self.mood_detection = self.config.get("mood_detection", {})
        self.response_style = self.config.get("response_style", {})
        self.medical_categories = self.config.get("medical_categories", {})

        self.lang_service = LanguageService(str(ai_config_path) if ai_config_path else None)
        self.learning_service = LearningService(database_manager, str(ai_config_path) if ai_config_path else None)

        # Initialize medical services only if available
        if MEDICAL_SERVICES_AVAILABLE:
            self.medical_knowledge = MedicalKnowledgeService(database_manager)
            self.medical_analytics = MedicalAnalyticsService(database_manager)
            logger.info("Medical knowledge services initialized")
        else:
            self.medical_knowledge = None
            self.medical_analytics = None
            logger.info("Medical services not available - using basic chibi generation only")

        self.hf_client = HuggingFaceClientService(
            hf_api_token,
            hf_base_url,
            hf_model,
            hf_timeout
        )

        # Initialize FileProcessingService with DeepSeek-V3.2-Exp model
        self.file_processor = FileProcessingService(
            hf_api_token=hf_api_token,
            hf_base_url=hf_base_url,
            hf_model=hf_model
        )

        logger.info("Medical AI Service initialized with file processing support (DeepSeek-V3.2-Exp)")

    def detect_language(self, message: str) -> str:
        return self.lang_service.detect_language(message)

    def categorize_question(self, message: str, lang: str) -> str:
        message_lower = message.lower()

        strict_medical = self.medical_categories.get("strict_medical", {}).get(lang, [])
        if any(keyword in message_lower for keyword in strict_medical):
            return "strict_medical"

        general_health = self.medical_categories.get("general_health", {}).get(lang, [])
        if any(keyword in message_lower for keyword in general_health):
            return "general_health"

        casual = self.medical_categories.get("casual", {}).get(lang, [])
        if any(keyword in message_lower for keyword in casual):
            return "casual"

        return "general"

    def is_medical_question(self, message: str, lang: str) -> bool:
        category = self.categorize_question(message, lang)
        return category in ["strict_medical", "general_health"]

    def detect_mood(self, message: str, lang: str) -> str:
        message_lower = message.lower()

        positive_keywords = self.mood_detection.get("positive_keywords", {}).get(lang, [])
        negative_keywords = self.mood_detection.get("negative_keywords", {}).get(lang, [])
        urgent_keywords = self.mood_detection.get("urgent_keywords", {}).get(lang, [])
        confused_keywords = self.mood_detection.get("confused_keywords", {}).get(lang, [])

        if any(keyword in message_lower for keyword in urgent_keywords):
            return "urgent"
        if any(keyword in message_lower for keyword in confused_keywords):
            return "confused"
        if any(keyword in message_lower for keyword in negative_keywords):
            return "negative"
        if any(keyword in message_lower for keyword in positive_keywords):
            return "positive"

        return "neutral"

    def get_mood_prefix(self, mood: str, lang: str) -> str:
        mood_prefix = self.response_style.get(f"{mood}_mood", {}).get(lang, "")
        return mood_prefix

    def is_greeting(self, message: str, lang: str) -> bool:
        message_lower = message.lower().strip()
        greeting_list = self.greetings.get(lang, [])

        for greeting in greeting_list:
            if greeting.lower() in message_lower and len(message_lower) < 30:
                return True
        return False

    def calculate_medical_complexity(self, message: str, lang: str) -> float:
        message_lower = message.lower()

        if self.is_greeting(message, lang):
            return 0.0

        category = self.categorize_question(message, lang)

        if category == "strict_medical":
            base_score = 0.8
        elif category == "general_health":
            base_score = 0.5
        elif category == "casual":
            return 0.2
        else:
            base_score = 0.3

        medical_keywords_count = sum(
            1 for keyword in self.medical_keywords.get(lang, [])
            if keyword.lower() in message_lower
        )

        keyword_boost = min(medical_keywords_count * 0.1, 0.3)

        message_length = len(message)
        if message_length > 150:
            length_boost = 0.1
        elif message_length > 100:
            length_boost = 0.05
        else:
            length_boost = 0.0

        final_score = min(base_score + keyword_boost + length_boost, 1.0)

        return final_score

    def contains_emergency_keywords(self, message: str) -> bool:
        message_lower = message.lower()

        for lang_keywords in self.emergency_keywords.values():
            for keyword in lang_keywords:
                if keyword.lower() in message_lower:
                    msg = self.log_msgs.get("emergency_keyword_detected", "Emergency keyword: {}")
                    logger.warning(msg.format(keyword))
                    return True
        return False

    def contains_illegal_content(self, message: str) -> Tuple[bool, Optional[str]]:
        message_lower = message.lower()

        for lang, keywords in self.illegal_content_keywords.items():
            for keyword in keywords:
                if keyword.lower() in message_lower:
                    logger.warning(f"Illegal content detected [{lang}]: {keyword}")
                    return True, keyword
        return False, None

    def generate_illegal_content_warning(self, lang: str, is_repeat: bool = False) -> str:
        if is_repeat:
            warnings = {
                "th": "⚖️ **คำเตือนครั้งสุดท้าย**\n\nข้อมูลการสนทนาของคุณได้ถูกบันทึกไว้แล้วค่ะ\n\n🚨 **ดำเนินการแล้ว:**\n• บันทึกข้อมูลผู้ใช้และเนื้อหาการสนทนา\n• รายงานไปยังหน่วยงานที่เกี่ยวข้อง\n• เริ่มกระบวนการทางกฎหมาย\n\n⚖️ **ขั้นตอนต่อไป:**\nหนูจะดำเนินการยื่นฟ้องตามกฎหมายค่ะ\n\nขอให้คุณระมัดระวังการกระทำของคุณค่ะ\nหากคุณมีปัญหาทางใจ โปรดติดต่อศูนย์ให้คำปรึกษา สายด่วนสุขภาพจิต 1323 ค่ะ",
                "en": "⚖️ **FINAL WARNING**\n\nYour conversation data has been recorded.\n\n🚨 **Actions Taken:**\n• User data and conversation content recorded\n• Reported to relevant authorities\n• Legal proceedings initiated\n\n⚖️ **Next Steps:**\nI will proceed with filing a lawsuit as per the law.\n\nPlease be mindful of your actions.\nIf you're experiencing mental health issues, please contact Mental Health Hotline 1323.",
                "ja": "⚖️ **最終警告**\n\nあなたの会話データは記録されました。\n\n🚨 **実施された措置:**\n• ユーザーデータと会話内容を記録\n• 関連当局に報告\n• 法的手続きを開始\n\n⚖️ **次のステップ:**\n法律に従って訴訟を提起します。\n\nご自身の行動に注意してください。\nメンタルヘルスの問題がある場合は、メンタルヘルスホットライン1323にご連絡ください。"
            }
        else:
            warnings = {
                "th": "⚠️ **คำเตือนครั้งแรก**\n\nหนูไม่สามารถตอบคำถามที่เกี่ยวข้องกับการกระทำที่ผิดกฎหมายได้ค่ะ\n\n🚨 **กรุณาทราบ:**\nหากคุณถามคำถามที่ผิดกฎหมายอีกครั้ง:\n• ข้อมูลการสนทนาจะถูกบันทึกและเก็บไว้\n• จะมีการแจ้งความและรายงานต่อหน่วยงานที่เกี่ยวข้อง\n• จะดำเนินการตามกฎหมายและยื่นฟ้องทันที\n\n💚 **หนูสามารถช่วยได้:**\nหนูเชี่ยวชาญด้านการแพทย์และสุขภาพค่ะ\nถ้าคุณมีคำถามเกี่ยวกับสุขภาพหรือการแพทย์ หนูยินดีให้คำแนะนำค่ะ\n\nหากคุณต้องการความช่วยเหลือด้านจิตใจ โปรดติดต่อ:\n📞 สายด่วนสุขภาพจิต 1323 (24 ชม.)",
                "en": "⚠️ **FIRST WARNING**\n\nI cannot answer questions related to illegal activities.\n\n🚨 **Please Be Aware:**\nIf you ask illegal questions again:\n• Conversation data will be recorded and stored\n• Authorities will be notified and reported to\n• Legal action and lawsuit will proceed immediately\n\n💚 **How I Can Help:**\nI specialize in medical and health topics.\nIf you have health or medical questions, I'm happy to help.\n\nIf you need mental health support, please contact:\n📞 Mental Health Hotline 1323 (24/7)",
                "ja": "⚠️ **最初の警告**\n\n違法行為に関する質問には答えられません。\n\n🚨 **ご注意ください:**\n違法な質問を再度された場合:\n• 会話データが記録・保存されます\n• 当局に通知・報告されます\n• 直ちに法的措置と訴訟が進められます\n\n💚 **サポート可能な内容:**\n医療と健康分野を専門としています。\n健康や医療に関する質問があれば、喜んでお手伝いします。\n\nメンタルヘルスのサポートが必要な場合は:\n📞 メンタルヘルスホットライン 1323（24時間）"
            }

        return warnings.get(lang, warnings["th"])

    def extract_symptoms(self, message: str, lang: str = "en"):
        symptoms = []
        patterns = self.symptom_patterns.get(lang, self.symptom_patterns.get("en", {}))
        message_lower = message.lower()

        for symptom, keywords in patterns.items():
            if any(keyword.lower() in message_lower for keyword in keywords):
                symptoms.append(symptom)

        return symptoms

    def generate_emergency_response(self, lang: str = "en") -> str:
        template = self.config["emergency_response_template"].get(
            lang, self.config["emergency_response_template"].get("en", "")
        )
        return template.format(
            th_numbers=self.emergency_numbers_th,
            intl_numbers=self.emergency_numbers_intl,
        )

    def build_context(self, session_id: Optional[str], lang: str, symptoms, current_message: str) -> Optional[str]:
        MAX_CONTEXT_LENGTH = 4000
        context_parts = []
        total_length = 0

        try:
            if session_id is None:
                history = []
            else:
                history = self.db.get_conversation_history(session_id, limit=10)
        except Exception as e:
            logger.warning(f"Failed to get history: {e}")
            history = []

        if history:
            context_parts.append(f"Recent conversation ({len(history)} messages):")
            total_length += len(context_parts[-1])

            for conv in history[-3:]:
                if total_length >= MAX_CONTEXT_LENGTH:
                    break

                user_msg = (conv.get("user_message", "")[:200]).strip()
                ai_msg = (conv.get("ai_response", "")[:200]).strip()

                entry = f"Q: {user_msg}\nA: {ai_msg}\n"

                if total_length + len(entry) > MAX_CONTEXT_LENGTH:
                    break

                context_parts.append(entry)
                total_length += len(entry)

        result = "".join(context_parts)

        if len(result) > MAX_CONTEXT_LENGTH:
            result = result[:MAX_CONTEXT_LENGTH] + "..."

        return result

    def enrich_with_medical_knowledge(self, prompt: str, symptoms, lang: str = "th") -> str:
        # Skip if medical services not available
        if not MEDICAL_SERVICES_AVAILABLE or not self.medical_knowledge:
            return ""

        enrichment_parts = []

        try:
            knowledge_results = self.medical_knowledge.search_medical_knowledge(
                query=prompt,
                lang=lang,
                limit=3
            )

            if knowledge_results:
                enrichment_parts.append("\n[Relevant Medical Knowledge]:\n")
                for idx, knowledge in enumerate(knowledge_results, 1):
                    enrichment_parts.append(
                        f"{idx}. {knowledge['title']} (Reliability: {knowledge['reliability_score']:.0%})\n"
                        f"   {knowledge['content'][:300]}...\n"
                    )

            if symptoms:
                conditions = self.medical_knowledge.find_conditions_by_symptoms(
                    symptoms=symptoms,
                    lang=lang,
                    min_probability=0.3
                )

                if conditions:
                    enrichment_parts.append("\n[Possible Conditions]:\n")
                    for idx, condition in enumerate(conditions[:3], 1):
                        enrichment_parts.append(
                            f"{idx}. {condition['condition_name']} "
                            f"(Probability: {condition['probability']:.0%})\n"
                            f"   {condition['description'][:200]}...\n"
                        )

            enrichment = "".join(enrichment_parts)

            if enrichment:
                logger.info(f"RAG enriched with {len(knowledge_results)} knowledge items")
                return enrichment

        except Exception as e:
            logger.error(f"Error enriching with medical knowledge: {e}")

        return ""

    def detect_analytics_query(self, prompt: str, lang: str = "th"):
        prompt_lower = prompt.lower()

        analytics_keywords_th = [
            "สถิติ", "วิเคราะห์", "แนวโน้ม", "ระบาด", "ทำนาย", "พยากรณ์",
            "แผนก", "department", "คะแนน", "score", "ประสิทธิภาพ",
            "ฤดูกาล", "seasonal", "แคมเปญ", "campaign", "รณรงค์",
            "เพิ่มขึ้น", "ลดลง", "มากที่สุด", "น้อยที่สุด"
        ]

        analytics_keywords_en = [
            "statistics", "analyze", "trend", "outbreak", "predict",
            "department", "score", "effectiveness", "seasonal",
            "campaign", "promotion", "increasing", "decreasing"
        ]

        keywords = analytics_keywords_th if lang == "th" else analytics_keywords_en
        has_analytics = any(keyword in prompt_lower for keyword in keywords)

        if not has_analytics:
            return {"is_analytics": False}

        analytics_type = "general"
        target_department: Optional[str] = None
        target_disease: Optional[str] = None

        departments = ["production", "engineering", "quality", "warehouse", "hr", "it"]
        for dept in departments:
            if dept in prompt_lower:
                target_department = dept.capitalize()
                analytics_type = "department_health"
                break

        return {
            "is_analytics": True,
            "analytics_type": analytics_type,
            "target_department": target_department,
            "target_disease": target_disease
        }

    def enrich_with_analytics(self, prompt: str, lang: str = "th", analytics_info: Optional[dict] = None) -> str:
        # Skip if medical analytics not available
        if not MEDICAL_SERVICES_AVAILABLE or not self.medical_analytics:
            return ""

        if not analytics_info or not analytics_info.get("is_analytics"):
            return ""

        enrichment_parts = []

        try:
            analytics_type = analytics_info.get("analytics_type", "general")
            department = analytics_info.get("target_department")

            if analytics_type in ["department_health", "general"] and department:
                health_score = self.medical_analytics.calculate_department_health_score(
                    department=department
                )

                if health_score and not health_score.get("error"):
                    enrichment_parts.append("\n[Department Health Score]:\n")
                    enrichment_parts.append(
                        f"Department: {health_score.get('department')}\n"
                        f"Health Score: {health_score.get('health_score', 0):.1f}/100\n"
                        f"Grade: {health_score.get('grade')}\n"
                    )

            enrichment = "".join(enrichment_parts)

            if enrichment:
                logger.info(f"Analytics enriched with type: {analytics_type}")
                return enrichment

        except Exception as e:
            logger.error(f"Error enriching with analytics: {e}")

        return ""

    async def call_ai_hybrid(
        self,
        prompt: str,
        session_id: Optional[str] = None,
        lang: str = "en",
        queue_size: int = 0,
    ) -> Tuple[Optional[str], str]:

        # ปิดการใช้คำตอบสำเร็จรูป ให้ AI คิดใหม่ทุกครั้ง
        # เอาคำตอบเดิมมาเป็น reference context แทน
        learned_context = ""
        if self.enable_learning:
            similar = self.db.find_similar_questions(prompt, lang, self.similar_threshold)
            if similar and similar.get("answer"):
                logger.info(f"Found similar question (similarity: {similar['similarity']:.2%}) - using as context")
                learned_context = f"\n[Previous Answer Reference]:\nQ: {similar.get('question', '')}\nA: {similar.get('answer', '')}\n(Note: Use this as reference only, provide a fresh answer based on current context and mood)"

        complexity = self.calculate_medical_complexity(prompt, lang)
        mood = self.detect_mood(prompt, lang)
        category = self.categorize_question(prompt, lang)
        is_medical = self.is_medical_question(prompt, lang)

        logger.info(f"Query - Category: {category}, Complexity: {complexity:.2f}, Mood: {mood}")

        try:
            if len(prompt) > MAX_PROMPT_LENGTH:
                error_msg = {
                    "th": "คำถามยาวเกินไป กรุณาใช้คำถามสั้นลง",
                    "en": "Question too long. Please use a shorter question.",
                    "ja": "質問が長すぎます。短い質問を使用してください。"
                }
                return error_msg.get(lang, error_msg["en"]), "error"

            symptoms = self.extract_symptoms(prompt, lang)
            context = self.build_context(session_id, lang, symptoms, prompt)
            medical_enrichment = self.enrich_with_medical_knowledge(prompt, symptoms, lang)
            analytics_info = self.detect_analytics_query(prompt, lang)
            analytics_enrichment = self.enrich_with_analytics(prompt, lang, analytics_info)

            personality_prompt = self.config.get("system_prompt", {}).get(lang, "")
            mood_prefix = self.get_mood_prefix(mood, lang)

            template_dict = self.config.get("medical_prompt_template", {})
            template = template_dict.get(lang, template_dict.get("en", "You are a helpful medical assistant."))

            context_text = context if context and context.strip() else "No previous conversation"
            mood_text = mood_prefix if mood_prefix and mood_prefix.strip() else ""

            full_context = context_text
            if learned_context:
                full_context = f"{context_text}\n\n{learned_context}"
            if medical_enrichment:
                full_context = f"{full_context}\n\n{medical_enrichment}"
            if analytics_enrichment:
                full_context = f"{full_context}\n\n{analytics_enrichment}"

            medical_prompt = template.format(
                personality=personality_prompt,
                mood_prefix=mood_text,
                context=full_context,
                prompt=prompt,
            )

            # Get AI model config
            ai_config = self.config.get("ai_model", {})
            temperature = ai_config.get("temperature", 0.85)
            max_tokens = ai_config.get("max_tokens", 2048)
            top_p = ai_config.get("top_p", 0.95)

            response = await self.hf_client.generate_response(
                medical_prompt,
                lang=lang,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p
            )

            if response and self.enable_learning:
                try:
                    confidence = min(0.5 + (complexity * 0.5), 0.95)
                    self.learning_service.learn_from_interaction(
                        prompt, response, symptoms, category, lang, confidence
                    )
                except Exception as e:
                    logger.warning(f"Learning failed: {e}")

            return response, "maemi" if response else "error"

        except Exception as e:
            logger.error(f"AI error: {e}")
            return None, "error"

    def _get_default_config(self):
        return {
            "emergency_keywords": {},
            "emergency_numbers": {"th": [], "intl": []},
            "symptom_patterns": {},
            "medical_keywords": {},
            "greetings": {},
            "medical_indicators": {},
            "mood_detection": {},
            "response_style": {},
            "medical_categories": {},
            "personality_traits": {},
            "system_prompts": {},
            "medical_prompt_template": {},
            "emergency_response_template": {},
        }
