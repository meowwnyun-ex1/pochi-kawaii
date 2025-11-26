"""
Context-Aware Suggested Questions Service
สร้างคำถามแนะนำที่ตรงกับบริบทของการสนทนา
"""

import logging
import re
from typing import List, Dict, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from database import DatabaseManager

logger = logging.getLogger(__name__)


class ContextAwareService:
    """
    Service สำหรับสร้างคำถามแนะนำที่ตรงกับบริบทของการสนทนา

    Features:
    - วิเคราะห์ context จากประวัติการสนทนา
    - สร้างคำถามที่เกี่ยวข้องกับหัวข้อที่กำลังพูดถึง
    - รองรับหลายภาษา (ไทย, อังกฤษ, ญี่ปุ่น)
    - ใช้ AI เพื่อเข้าใจ intent ของผู้ใช้
    """

    def __init__(self, database_manager: "DatabaseManager"):
        self.db = database_manager

        # Medical topics และคำถามที่เกี่ยวข้อง
        self.medical_topics = {
            "pain": {
                "th": ["ปวด", "เจ็บ", "แสบ"],
                "en": ["pain", "ache", "hurt", "sore"],
                "ja": ["痛", "痛み", "苦しみ"]
            },
            "fever": {
                "th": ["ไข้", "ตัวร้อน", "อุณหภูมิสูง"],
                "en": ["fever", "temperature", "hot"],
                "ja": ["熱", "発熱"]
            },
            "cold": {
                "th": ["หวัด", "น้ำมูก", "คัดจมูก", "เจ็บคอ"],
                "en": ["cold", "flu", "runny nose", "sore throat", "cough"],
                "ja": ["風邪", "咳", "鼻水"]
            },
            "stomach": {
                "th": ["ท้อง", "อาเจียน", "ท้องเสีย", "ท้องผูก"],
                "en": ["stomach", "nausea", "vomit", "diarrhea", "constipation"],
                "ja": ["胃", "吐き気", "下痢", "便秘"]
            },
            "headache": {
                "th": ["ปวดหัว", "เวียนหัว", "ศีรษะ"],
                "en": ["headache", "migraine", "dizzy"],
                "ja": ["頭痛", "めまい"]
            },
            "allergy": {
                "th": ["แพ้", "คัน", "ผื่น", "บวม"],
                "en": ["allergy", "allergic", "rash", "itch", "swelling"],
                "ja": ["アレルギー", "かゆみ", "発疹"]
            },
            "breathing": {
                "th": ["หายใจ", "หอบ", "เหนื่อย", "แน่นหน้าอก"],
                "en": ["breathing", "breath", "asthma", "chest"],
                "ja": ["呼吸", "息切れ", "喘息"]
            },
            "skin": {
                "th": ["ผิว", "สิว", "รอยแผล", "ไหม้"],
                "en": ["skin", "acne", "wound", "burn", "cut"],
                "ja": ["皮膚", "ニキビ", "傷", "やけど"]
            },
            "diabetes": {
                "th": ["เบาหวาน", "น้ำตาล", "อินซูลิน"],
                "en": ["diabetes", "sugar", "insulin", "glucose"],
                "ja": ["糖尿病", "血糖", "インスリン"]
            },
            "pressure": {
                "th": ["ความดัน", "ความดันเลือด", "ความดันสูง", "ความดันต่ำ"],
                "en": ["blood pressure", "hypertension", "hypotension"],
                "ja": ["血圧", "高血圧", "低血圧"]
            }
        }

        # Suggested questions for each topic
        self.topic_questions = {
            "pain": {
                "th": [
                    "ปวดบริเวณไหนบ้างครับ?",
                    "อาการปวดมานานแล้วหรือยังครับ?",
                    "มีอะไรช่วยบรรเทาอาการปวดได้บ้างไหมครับ?",
                    "ควรทานยาแก้ปวดชนิดไหนดีครับ?"
                ],
                "en": [
                    "Where does it hurt?",
                    "How long have you had the pain?",
                    "What helps relieve the pain?",
                    "What pain medication should I take?"
                ],
                "ja": [
                    "どこが痛みますか?",
                    "痛みはどのくらい続いていますか?",
                    "痛みを和らげる方法は?",
                    "どんな鎮痛剤を飲めばいいですか?"
                ]
            },
            "fever": {
                "th": [
                    "ไข้สูงกี่องศาครับ?",
                    "มีอาการอื่นๆ ประกอบไหมครับ?",
                    "ควรทานยาลดไข้หรือไม่ครับ?",
                    "เมื่อไหร่ควรพบแพทย์ครับ?"
                ],
                "en": [
                    "What's your temperature?",
                    "Do you have any other symptoms?",
                    "Should I take fever medication?",
                    "When should I see a doctor?"
                ],
                "ja": [
                    "熱は何度ですか?",
                    "他の症状はありますか?",
                    "解熱剤を飲むべきですか?",
                    "いつ医者に行くべきですか?"
                ]
            },
            "cold": {
                "th": [
                    "หวัดมานานแค่ไหนแล้วครับ?",
                    "มีน้ำมูกหรือเจ็บคอไหมครับ?",
                    "ควรทานยาอะไรดีครับ?",
                    "จะหายเร็วขึ้นได้อย่างไรครับ?"
                ],
                "en": [
                    "How long have you had the cold?",
                    "Do you have runny nose or sore throat?",
                    "What medicine should I take?",
                    "How can I recover faster?"
                ],
                "ja": [
                    "風邪はどのくらい続いていますか?",
                    "鼻水や喉の痛みはありますか?",
                    "どんな薬を飲めばいいですか?",
                    "早く治る方法は?"
                ]
            },
            "stomach": {
                "th": [
                    "ท้องเสียมานานแค่ไหนครับ?",
                    "ควรทานอาหารอะไรดีครับ?",
                    "ควรทานยาแก้ท้องเสียหรือไม่ครับ?",
                    "อาการไหนควรระวังครับ?"
                ],
                "en": [
                    "How long have you had diarrhea?",
                    "What should I eat?",
                    "Should I take anti-diarrhea medicine?",
                    "What symptoms should I watch for?"
                ],
                "ja": [
                    "下痢はどのくらい続いていますか?",
                    "何を食べればいいですか?",
                    "下痢止めを飲むべきですか?",
                    "どんな症状に注意すべきですか?"
                ]
            },
            "general": {
                "th": [
                    "มีอาการผิดปกติอื่นๆ ไหมครับ?",
                    "ควรระวังอะไรบ้างครับ?",
                    "เมื่อไหร่ควรพบแพทย์ครับ?",
                    "มีวิธีดูแลตัวเองอย่างไรบ้างครับ?"
                ],
                "en": [
                    "Any other unusual symptoms?",
                    "What should I be careful about?",
                    "When should I see a doctor?",
                    "How can I take care of myself?"
                ],
                "ja": [
                    "他に異常な症状はありますか?",
                    "何に注意すべきですか?",
                    "いつ医者に行くべきですか?",
                    "どうやって自分をケアできますか?"
                ]
            }
        }

        logger.info("🎯 Context-Aware Service initialized")

    def detect_topics(self, message: str, lang: str) -> List[str]:
        """
        ตรวจจับหัวข้อจากข้อความ

        Args:
            message: ข้อความที่จะตรวจสอบ
            lang: ภาษา

        Returns:
            List[str]: รายการหัวข้อที่ตรวจพบ
        """
        message_lower = message.lower()
        detected_topics = []

        for topic, keywords_dict in self.medical_topics.items():
            keywords = keywords_dict.get(lang, [])
            if any(keyword in message_lower for keyword in keywords):
                detected_topics.append(topic)

        return detected_topics

    def get_context_from_history(
        self,
        session_id: str,
        limit: int = 5
    ) -> Dict[str, any]:
        """
        ดึง context จากประวัติการสนทนา

        Args:
            session_id: Session ID
            limit: จำนวนข้อความที่จะดึง

        Returns:
            Dict: Context information
        """
        try:
            if not self.db.connection_available:
                return {"topics": [], "recent_messages": []}

            history = self.db.get_conversation_history(session_id, limit=limit)

            if not history:
                return {"topics": [], "recent_messages": []}

            # รวบรวมหัวข้อจากประวัติ
            all_topics = set()
            recent_messages = []

            for conv in history:
                user_msg = conv.get("user_message", "")
                lang = conv.get("language", "th")

                # ตรวจจับหัวข้อ
                topics = self.detect_topics(user_msg, lang)
                all_topics.update(topics)

                recent_messages.append({
                    "message": user_msg,
                    "language": lang,
                    "topics": topics
                })

            return {
                "topics": list(all_topics),
                "recent_messages": recent_messages,
                "conversation_count": len(history)
            }

        except Exception as e:
            logger.error(f"Error getting context from history: {e}")
            return {"topics": [], "recent_messages": []}

    def generate_context_aware_questions(
        self,
        current_message: str,
        session_id: Optional[str],
        lang: str = "th",
        count: int = 4
    ) -> List[str]:
        """
        สร้างคำถามแนะนำที่ตรงกับ context

        Args:
            current_message: ข้อความปัจจุบัน
            session_id: Session ID
            lang: ภาษา
            count: จำนวนคำถามที่ต้องการ

        Returns:
            List[str]: รายการคำถามแนะนำ
        """
        try:
            # ตรวจจับหัวข้อจากข้อความปัจจุบัน
            current_topics = self.detect_topics(current_message, lang)

            # ดึง context จากประวัติ
            context = {"topics": [], "recent_messages": []}
            if session_id:
                context = self.get_context_from_history(session_id, limit=5)

            # รวมหัวข้อจากทั้งข้อความปัจจุบันและประวัติ
            all_topics = set(current_topics + context.get("topics", []))

            # สร้างคำถามแนะนำ
            suggested_questions = []

            # เลือกคำถามจากหัวข้อที่ตรวจพบ
            for topic in all_topics:
                if topic in self.topic_questions:
                    questions = self.topic_questions[topic].get(lang, [])
                    for q in questions:
                        if q not in suggested_questions:
                            suggested_questions.append(q)
                        if len(suggested_questions) >= count:
                            break
                if len(suggested_questions) >= count:
                    break

            # ถ้ายังไม่ครบ ให้เพิ่มคำถามทั่วไป
            if len(suggested_questions) < count:
                general_questions = self.topic_questions["general"].get(lang, [])
                for q in general_questions:
                    if q not in suggested_questions:
                        suggested_questions.append(q)
                    if len(suggested_questions) >= count:
                        break

            logger.info(
                f"🎯 Generated {len(suggested_questions)} context-aware questions "
                f"for topics: {', '.join(all_topics) if all_topics else 'general'}"
            )

            return suggested_questions[:count]

        except Exception as e:
            logger.error(f"Error generating context-aware questions: {e}")
            # Fallback to general questions
            return self.topic_questions["general"].get(lang, [])[:count]

    def analyze_user_intent(
        self,
        message: str,
        lang: str = "th"
    ) -> Dict[str, any]:
        """
        วิเคราะห์ความตั้งใจของผู้ใช้จากข้อความ

        Args:
            message: ข้อความที่จะวิเคราะห์
            lang: ภาษา

        Returns:
            Dict: ข้อมูลการวิเคราะห์
        """
        try:
            message_lower = message.lower()

            intent = {
                "type": "unknown",
                "topics": [],
                "urgency": "normal",
                "is_question": False,
                "needs_medical_advice": False
            }

            # ตรวจสอบว่าเป็นคำถามหรือไม่
            question_patterns = {
                "th": ["ไหม", "หรือเปล่า", "อย่างไร", "ทำไม", "เมื่อไหร่", "ที่ไหน", "อะไร", "ใคร"],
                "en": ["how", "what", "when", "where", "why", "who", "is", "are", "do", "does", "can", "could", "should"],
                "ja": ["どう", "何", "いつ", "どこ", "なぜ", "誰", "ですか", "ますか"]
            }

            patterns = question_patterns.get(lang, [])
            intent["is_question"] = any(pattern in message_lower for pattern in patterns) or message.strip().endswith("?")

            # ตรวจจับหัวข้อ
            intent["topics"] = self.detect_topics(message, lang)

            # ตรวจสอบความเร่งด่วน
            urgent_keywords = {
                "th": ["เร่งด่วน", "ฉุกเฉิน", "ด่วน", "เจ็บมาก", "ปวดมาก", "ช่วยด้วย"],
                "en": ["urgent", "emergency", "severe", "critical", "help", "serious"],
                "ja": ["緊急", "重症", "助けて", "深刻"]
            }

            urgent_words = urgent_keywords.get(lang, [])
            if any(word in message_lower for word in urgent_words):
                intent["urgency"] = "high"

            # ตรวจสอบว่าต้องการคำแนะนำทางการแพทย์หรือไม่
            intent["needs_medical_advice"] = len(intent["topics"]) > 0 or intent["is_question"]

            # กำหนดประเภทของ intent
            if intent["urgency"] == "high":
                intent["type"] = "emergency"
            elif intent["is_question"]:
                intent["type"] = "inquiry"
            elif len(intent["topics"]) > 0:
                intent["type"] = "symptom_report"
            else:
                intent["type"] = "general"

            return intent

        except Exception as e:
            logger.error(f"Error analyzing user intent: {e}")
            return {
                "type": "unknown",
                "topics": [],
                "urgency": "normal",
                "is_question": False,
                "needs_medical_advice": False
            }
