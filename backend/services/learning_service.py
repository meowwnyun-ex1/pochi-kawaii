import json
import logging
import os
from pathlib import Path
from typing import List, Dict, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from database import DatabaseManager

logger = logging.getLogger(__name__)


class LearningService:
    def __init__(self, database_manager: "DatabaseManager", ai_config_path: Optional[str] = None):
        self.db = database_manager

        # Determine config directory - always use backend/config
        config_dir = Path(__file__).parent.parent / "config"

        ai_config_file = os.getenv("AI_CONFIG_FILE", "ai_config.json")
        api_config_file = os.getenv("API_CONFIG_FILE", "api_config.json")
        api_config_path = config_dir / api_config_file

        # Use provided path or default to backend/config
        if ai_config_path:
            ai_config_path = Path(ai_config_path)
            # If relative path, use filename only and look in config_dir
            if not ai_config_path.is_absolute():
                ai_config_path = config_dir / ai_config_path.name
        else:
            ai_config_path = config_dir / ai_config_file

        logger.info(f"🔍 [LearningService] Loading config from: {ai_config_path}")

        try:
            if ai_config_path and ai_config_path.exists():
                with open(ai_config_path, "r", encoding="utf-8") as f:
                    self.config = json.load(f)
                logger.info(f"✅ [LearningService] Config loaded successfully")
            else:
                logger.error(f"❌ [LearningService] Config not found at: {ai_config_path}")
                self.config = {"learning_categories": {}}
        except Exception as e:
            logger.error(f"❌ Config load error: {e}")
            self.config = {"learning_categories": {}}

        try:
            if api_config_path and api_config_path.exists():
                with open(api_config_path, "r", encoding="utf-8") as f:
                    api_config = json.load(f)
                self.log_msgs = api_config.get("log_messages", {})
            else:
                self.log_msgs = {}
        except Exception as e:
            logger.warning(f"Could not load api_config.json: {api_config_path} ({e})")
            self.log_msgs = {}

        self.learning_categories = self.config.get("learning_categories", {})

    def learn_from_interaction(
        self, 
        question: str, 
        answer: str,
        symptoms: List[str], 
        category: str,
        lang: str,
        confidence: float
    ):
        try:
            success = self.db.save_learning_data(
                question=question,
                answer=answer,
                symptoms=symptoms,
                category=category,
                language=lang,
                confidence_score=confidence,
            )
            
            if success:
                msg = self.log_msgs.get("learned", "Learned: {} [{}]")
                logger.info(msg.format(category, lang))
                logger.info(f"Confidence: {confidence:.2f}, Question length: {len(question)}")
            
        except Exception as e:
            msg = self.log_msgs.get("learning_error", "Learning error: {}")
            logger.error(msg.format(e))

    def learn_from_question(self, question: str, symptoms: List[str], lang: str):
        try:
            category = self._categorize_question(question, symptoms)
            self.db.save_learning_data(
                question=question, 
                answer="",
                symptoms=symptoms, 
                category=category, 
                language=lang,
                confidence_score=0.5
            )
            msg = self.log_msgs.get("learned", "Learned: {} [{}]")
            logger.info(msg.format(category, lang))
        except Exception as e:
            msg = self.log_msgs.get("learning_error", "Learning error: {}")
            logger.error(msg.format(e))

    def _categorize_question(self, question: str, symptoms: List[str]) -> str:
        question_lower = question.lower()

        for category, keywords in self.learning_categories.items():
            if any(keyword in question_lower for keyword in keywords):
                return category

        if symptoms:
            return "common_symptoms"

        return "general"

    def get_learned_patterns(
        self, category: Optional[str], limit: int = 100
    ) -> List[Dict]:
        return self.db.get_learned_patterns(category or "general", limit)

    def get_improved_response_context(self, symptoms: List[str]) -> str:
        if not symptoms:
            return ""

        patterns = self.db.get_learned_patterns(limit=20)
        
        if not patterns:
            return ""

        relevant_patterns = []
        for pattern in patterns:
            pattern_symptoms = pattern.get("symptoms", [])
            if any(symptom in pattern_symptoms for symptom in symptoms):
                relevant_patterns.append(pattern)

        if not relevant_patterns:
            return ""

        context_parts = []
        for pattern in relevant_patterns[:5]:
            usage = pattern.get("usage_count", 0)
            confidence = pattern.get("confidence_score", 0)
            category = pattern.get("category", "unknown")
            
            context_parts.append(
                f"Pattern: {category}, Usage: {usage}, Confidence: {confidence:.2f}"
            )

        return "\n".join(context_parts)

    def update_symptom_frequency(self, symptom: str, lang: str):
        try:
            analytics = self.db.get_symptom_analytics(days=30, language=lang)

            symptom_found = any(item["symptom"] == symptom for item in analytics)

            if not symptom_found:
                msg = self.log_msgs.get("new_symptom", "New symptom: {} [{}]")
                logger.info(msg.format(symptom, lang))

        except Exception as e:
            msg = self.log_msgs.get("symptom_frequency_error", "Symptom frequency error: {}")
            logger.error(msg.format(e))

    def learn_from_database_conversations(self, limit: int = 100) -> Dict:
        """
        เรียนรู้จากการสนทนาที่มีอยู่ใน database
        ดึงข้อมูลจาก conversations table และวิเคราะห์เพื่อปรับปรุง AI

        Returns:
            Dict with learning statistics
        """
        try:
            # Get recent conversations from database directly
            conversations = self._get_all_conversations(limit)

            learned_count = 0
            categories_found = {}

            for conv in conversations:
                user_msg = conv.get("user_message", "")
                ai_resp = conv.get("ai_response", "")

                if not user_msg or not ai_resp:
                    continue

                # Extract symptoms (simple keyword matching)
                symptoms = self._extract_symptoms_from_text(user_msg)

                # Categorize
                category = self._categorize_question(user_msg, symptoms)
                categories_found[category] = categories_found.get(category, 0) + 1

                # Learn from this interaction with high confidence (it's real data)
                self.learn_from_interaction(
                    question=user_msg,
                    answer=ai_resp,
                    symptoms=symptoms,
                    category=category,
                    lang="th",  # Default to Thai, you can detect language
                    confidence=0.9  # High confidence for real conversations
                )

                learned_count += 1

            logger.info(f"✅ Learned from {learned_count} database conversations")
            logger.info(f"   Categories: {categories_found}")

            return {
                "learned": learned_count,
                "categories": categories_found,
                "source": "database_conversations"
            }

        except Exception as e:
            logger.error(f"Error learning from database: {e}")
            return {"learned": 0, "error": str(e)}

    def _get_all_conversations(self, limit: int = 100) -> List[Dict]:
        """Get all conversations from database"""
        if not self.db.connection_available or self.db.pool is None:
            return []

        try:
            with self.db.pool.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT TOP (?) user_message, ai_response, created_at
                    FROM conversations
                    ORDER BY created_at DESC
                """, limit)

                conversations = []
                for row in cursor.fetchall():
                    conversations.append({
                        "user_message": row.user_message,
                        "ai_response": row.ai_response,
                        "created_at": row.created_at
                    })

                cursor.close()
                return conversations

        except Exception as e:
            logger.error(f"Error getting conversations: {e}")
            return []

    def _extract_symptoms_from_text(self, text: str) -> List[str]:
        """Extract symptoms from text using keyword matching"""
        symptom_keywords = {
            "fever": ["ไข้", "fever", "発熱"],
            "headache": ["ปวดหัว", "headache", "頭痛"],
            "stomachache": ["ปวดท้อง", "stomach", "腹痛"],
            "cough": ["ไอ", "cough", "咳"],
            "sore_throat": ["เจ็บคอ", "sore throat", "喉"],
            "nausea": ["คลื่นไส้", "nausea", "吐き気"],
            "vomiting": ["อาเจียน", "vomit", "嘔吐"],
            "diarrhea": ["ท้องเสีย", "diarrhea", "下痢"],
            "dizziness": ["วิงเวียน", "dizzy", "めまい"],
            "fatigue": ["เหนื่อย", "tired", "疲れ"],
            "pain": ["ปวด", "เจ็บ", "pain", "痛"]
        }

        text_lower = text.lower()
        found_symptoms = []

        for symptom, keywords in symptom_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                found_symptoms.append(symptom)

        return found_symptoms

    def get_learning_stats(self) -> Dict:
        try:
            patterns = self.db.get_learned_patterns(limit=1000)

            total_patterns = len(patterns)

            high_confidence = sum(1 for p in patterns if p.get("confidence_score", 0) >= 0.8)

            total_usage = sum(p.get("usage_count", 0) for p in patterns)

            categories = {}
            for p in patterns:
                cat = p.get("category", "unknown")
                categories[cat] = categories.get(cat, 0) + 1

            # Get total conversations for context
            try:
                total_conversations = len(self.db.get_conversation_history(session_id=None, limit=10000))
            except Exception as e:
                logger.error(f"Failed to get conversation count: {e}")
                total_conversations = 0

            return {
                "total_learned": total_patterns,
                "total_conversations": total_conversations,
                "high_confidence_patterns": high_confidence,
                "total_usage": total_usage,
                "avg_usage": total_usage / total_patterns if total_patterns > 0 else 0,
                "categories": categories,
                "top_category": max(categories.items(), key=lambda x: x[1])[0] if categories else None
            }
        except Exception as e:
            logger.error(f"Error getting learning stats: {e}")
            return {
                "total_learned": 0,
                "total_conversations": 0,
                "high_confidence_patterns": 0,
                "total_usage": 0,
                "avg_usage": 0,
                "categories": {},
                "top_category": None
            }