import logging
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from difflib import SequenceMatcher
from services.connection_pool import ConnectionPool

logger = logging.getLogger(__name__)

MAX_MESSAGE_LENGTH = 10000
MAX_SYMPTOMS = 20
MAX_KEYWORD_LENGTH = 200

class DatabaseManager:
    def __init__(self, connection_string: str, timeout: int = 30, pool_size: int = 10, max_overflow: int = 20):
        self.connection_string = connection_string
        self.timeout = timeout
        self.connection_available = False
        self.pool: Optional[ConnectionPool] = None

        try:
            config_path = Path(__file__).parent / "config" / "api_config.json"
            with open(config_path, "r", encoding="utf-8") as f:
                api_config = json.load(f)
                self.db_msgs = api_config.get("database_messages", {})
                self.log_msgs = api_config.get("log_messages", {})
        except Exception as e:
            logger.warning(f"Could not load api_config.json: {e}")
            self.db_msgs = {}
            self.log_msgs = {}

        try:
            self.pool = ConnectionPool(connection_string, pool_size, max_overflow, timeout)
            self.connection_available = True
            logger.info(f"Connection pool initialized: size={pool_size}, overflow={max_overflow}")
        except Exception as e:
            logger.error(f"Failed to initialize connection pool: {e}")
            self.connection_available = False

    def _safe_json_parse(self, json_str: str, default=None):
        try:
            return json.loads(json_str) if json_str else default
        except (json.JSONDecodeError, TypeError):
            return default

    def get_connection(self):
        if not self.connection_available or self.pool is None:
            return None
        return self.pool.get_connection()

    def initialize_tables(self) -> bool:
        if not self.connection_available or self.pool is None:
            msg = self.db_msgs.get("unavailable_running_without", "Database unavailable - running without database")
            logger.warning(msg)
            return False

        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='feedback' AND xtype='U')
                    CREATE TABLE feedback (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        text NVARCHAR(MAX) NOT NULL,
                        name NVARCHAR(100) DEFAULT 'Anonymous',
                        rating INT DEFAULT 0,
                        comment NVARCHAR(MAX),
                        ip_address VARCHAR(50),
                        user_agent NVARCHAR(500),
                        language VARCHAR(10) DEFAULT 'th',
                        timestamp DATETIME DEFAULT GETDATE(),
                        INDEX idx_timestamp (timestamp),
                        INDEX idx_language (language),
                        INDEX idx_rating (rating)
                    )
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='conversations' AND xtype='U')
                    CREATE TABLE conversations (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        session_id VARCHAR(100) NOT NULL,
                        user_message NVARCHAR(MAX) NOT NULL,
                        ai_response NVARCHAR(MAX) NOT NULL,
                        pdpa_consent BIT DEFAULT 0,
                        is_emergency BIT DEFAULT 0,
                        source VARCHAR(50) DEFAULT 'ai',
                        symptoms NVARCHAR(MAX),
                        language VARCHAR(10) DEFAULT 'th',
                        confidence_score DECIMAL(5,4) DEFAULT 0.0,
                        created_at DATETIME DEFAULT GETDATE(),
                        metadata NVARCHAR(MAX),
                        error_log NVARCHAR(MAX),
                        response_time INT,
                        tokens_used INT,
                        INDEX idx_session_id (session_id),
                        INDEX idx_created_at (created_at),
                        INDEX idx_language (language),
                        INDEX idx_source (source),
                        INDEX idx_confidence (confidence_score)
                    )
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='learning_data' AND xtype='U')
                    CREATE TABLE learning_data (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        question NVARCHAR(MAX) NOT NULL,
                        answer NVARCHAR(MAX),
                        symptoms NVARCHAR(MAX),
                        category VARCHAR(100),
                        language VARCHAR(10) DEFAULT 'th',
                        confidence_score DECIMAL(5,4) DEFAULT 0.0,
                        usage_count INT DEFAULT 1,
                        success_rate DECIMAL(5,4) DEFAULT 1.0,
                        last_used DATETIME DEFAULT GETDATE(),
                        created_at DATETIME DEFAULT GETDATE(),
                        modified_at DATETIME,
                        source VARCHAR(50) DEFAULT 'user',
                        is_verified BIT DEFAULT 0,
                        verified_by VARCHAR(100),
                        verified_at DATETIME,
                        metadata NVARCHAR(MAX),
                        INDEX idx_category (category),
                        INDEX idx_language (language),
                        INDEX idx_confidence (confidence_score),
                        INDEX idx_usage (usage_count),
                        INDEX idx_last_used (last_used),
                        INDEX idx_is_verified (is_verified)
                    )
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='announcements' AND xtype='U')
                    CREATE TABLE announcements (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        title NVARCHAR(200),
                        image_filename NVARCHAR(255) NOT NULL,
                        link_url NVARCHAR(500),
                        display_order INT DEFAULT 0,
                        is_active BIT DEFAULT 1,
                        created_at DATETIME DEFAULT GETDATE(),
                        updated_at DATETIME DEFAULT GETDATE(),
                        INDEX idx_display_order (display_order),
                        INDEX idx_is_active (is_active)
                    )
                """)

                ALLOWED_COLUMNS_CONVERSATIONS = {
                    'metadata', 'error_log', 'response_time', 'tokens_used'
                }

                new_columns_conversations = [
                    ("metadata", "NVARCHAR(MAX)"),
                    ("error_log", "NVARCHAR(MAX)"),
                    ("response_time", "INT"),
                    ("tokens_used", "INT")
                ]

                for col_name, col_type in new_columns_conversations:
                    if col_name not in ALLOWED_COLUMNS_CONVERSATIONS:
                        logger.error(f"⚠️ Security: Invalid column name '{col_name}' blocked")
                        continue

                    cursor.execute(f"""
                        IF NOT EXISTS (
                            SELECT * FROM sys.columns
                            WHERE object_id = OBJECT_ID('conversations')
                            AND name = '{col_name}'
                        )
                        BEGIN
                            ALTER TABLE conversations
                            ADD {col_name} {col_type}
                        END
                    """)

                ALLOWED_COLUMNS_LEARNING = {
                    'modified_at', 'source', 'is_verified', 'verified_by', 'verified_at', 'metadata'
                }

                new_columns_learning = [
                    ("modified_at", "DATETIME"),
                    ("source", "VARCHAR(50) DEFAULT 'user'"),
                    ("is_verified", "BIT DEFAULT 0"),
                    ("verified_by", "VARCHAR(100)"),
                    ("verified_at", "DATETIME"),
                    ("metadata", "NVARCHAR(MAX)")
                ]

                for col_name, col_type in new_columns_learning:
                    if col_name not in ALLOWED_COLUMNS_LEARNING:
                        logger.error(f"⚠️ Security: Invalid column name '{col_name}' blocked")
                        continue

                    cursor.execute(f"""
                        IF NOT EXISTS (
                            SELECT * FROM sys.columns
                            WHERE object_id = OBJECT_ID('learning_data')
                            AND name = '{col_name}'
                        )
                        BEGIN
                            ALTER TABLE learning_data
                            ADD {col_name} {col_type}
                        END
                    """)

                cursor.execute("""
                    IF EXISTS (
                        SELECT * FROM sys.columns 
                        WHERE object_id = OBJECT_ID('conversations')
                        AND name = 'confidence_score'
                        AND system_type_id != TYPE_ID('decimal')
                    )
                    BEGIN
                        ALTER TABLE conversations
                        ALTER COLUMN confidence_score DECIMAL(5,4)
                    END
                """)

                cursor.execute("""
                    IF EXISTS (
                        SELECT * FROM sys.columns 
                        WHERE object_id = OBJECT_ID('learning_data')
                        AND name = 'confidence_score'
                        AND system_type_id != TYPE_ID('decimal')
                    )
                    BEGIN
                        ALTER TABLE learning_data
                        ALTER COLUMN confidence_score DECIMAL(5,4)
                    END

                    IF EXISTS (
                        SELECT * FROM sys.columns 
                        WHERE object_id = OBJECT_ID('learning_data')
                        AND name = 'success_rate'
                        AND system_type_id != TYPE_ID('decimal')
                    )
                    BEGIN
                        ALTER TABLE learning_data
                        ALTER COLUMN success_rate DECIMAL(5,4)
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.objects WHERE type = 'TR' AND name = 'TR_LearningData_Update')
                    BEGIN
                        EXEC('CREATE TRIGGER TR_LearningData_Update
                        ON learning_data
                        AFTER UPDATE
                        AS
                        BEGIN
                            UPDATE learning_data
                            SET modified_at = GETDATE()
                            FROM learning_data
                            INNER JOIN inserted ON learning_data.id = inserted.id
                        END')
                    END
                """)

                conn.commit()
                cursor.close()
            
            msg = self.db_msgs.get("tables_initialized", "Database tables initialized")
            logger.info(msg)
            self.connection_available = True
            return True

        except Exception as e:
            msg = self.db_msgs.get("initialization_skipped", "Database initialization skipped: {}")
            logger.warning(msg.format(e))
            self.connection_available = False
            return False

    def save_conversation(
        self,
        session_id: str,
        user_message: str,
        ai_response: str,
        is_emergency: bool = False,
        source: str = "ai",
        symptoms: Optional[List[str]] = None,
        language: str = "th",
        confidence_score: float = 0.0,
    ) -> bool:
        if not self.connection_available or self.pool is None:
            logger.warning("Database not available")
            return False

        if not session_id or not session_id.strip():
            logger.error("Empty session_id")
            return False

        if not user_message or not user_message.strip():
            logger.error("Empty user_message")
            return False

        if len(user_message) > MAX_MESSAGE_LENGTH:
            logger.warning(f"Message too long: {len(user_message)}, truncating")
            user_message = user_message[:MAX_MESSAGE_LENGTH]

        if len(ai_response) > MAX_MESSAGE_LENGTH:
            logger.warning(f"Response too long: {len(ai_response)}, truncating")
            ai_response = ai_response[:MAX_MESSAGE_LENGTH]

        if symptoms:
            symptoms = symptoms[:MAX_SYMPTOMS]
            
        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()
                
                try:
                    symptoms_json = json.dumps(symptoms, ensure_ascii=False) if symptoms else None

                    cursor.execute("""
                        INSERT INTO conversations
                        (session_id, user_message, ai_response, is_emergency, source, symptoms, language, confidence_score)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        session_id.strip(),
                        user_message.strip(),
                        ai_response.strip(),
                        is_emergency,
                        source,
                        symptoms_json,
                        language,
                        confidence_score,
                    ))

                    conn.commit()
                    logger.debug(f"Saved conversation for session {session_id}")
                    return True
                    
                except Exception as e:
                    conn.rollback()
                    raise
                finally:
                    cursor.close()
                    
        except Exception as e:
            msg = self.log_msgs.get("save_conversation_failed", "Save conversation failed: {}")
            logger.error(msg.format(e))
            return False

    def get_conversation_history(self, session_id: str, limit: int = 20) -> List[Dict]:
        if not self.connection_available or self.pool is None:
            return []
            
        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()

                cursor.execute("""
                    SELECT TOP (?) user_message, ai_response, created_at, language, source, confidence_score
                    FROM conversations
                    WHERE session_id = ?
                    ORDER BY created_at DESC
                """, (limit, session_id))

                results = cursor.fetchall()
                cursor.close()

            history = []
            for row in results:
                history.append({
                    "user_message": row[0],
                    "ai_response": row[1],
                    "timestamp": row[2].isoformat() if row[2] else None,
                    "language": row[3] if len(row) > 3 else "th",
                    "source": row[4] if len(row) > 4 else "ai",
                    "confidence_score": row[5] if len(row) > 5 else 0.0,
                })

            return list(reversed(history))
        except Exception as e:
            msg = self.log_msgs.get("get_conversation_history_failed", "Get conversation history failed: {}")
            logger.warning(msg.format(e))
            return []

    def find_similar_questions(self, question: str, lang: str, threshold: float = 0.90) -> Optional[Dict]:
        if not self.connection_available or self.pool is None:
            return None
            
        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()

                cursor.execute("""
                    SELECT TOP (20) question, answer, confidence_score, usage_count, success_rate
                    FROM learning_data
                    WHERE language = ? AND answer IS NOT NULL AND confidence_score >= ?
                    ORDER BY usage_count DESC, confidence_score DESC
                """, (lang, threshold - 0.1))

                results = cursor.fetchall()
                cursor.close()

            question_lower = question.lower().strip()
            
            best_match = None
            best_score = 0.0

            for row in results:
                stored_question = row[0].lower().strip()
                similarity = SequenceMatcher(None, question_lower, stored_question).ratio()
                
                if similarity >= threshold and similarity > best_score:
                    best_score = similarity
                    best_match = {
                        "question": row[0],
                        "answer": row[1],
                        "confidence_score": row[2],
                        "usage_count": row[3],
                        "success_rate": row[4],
                        "similarity": similarity
                    }

            if best_match:
                self._increment_usage_count(best_match["question"], lang)
                logger.info(f"Found similar question with {best_score:.2%} similarity")

            return best_match

        except Exception as e:
            logger.error(f"Error finding similar questions: {e}")
            return None

    def _increment_usage_count(self, question: str, lang: str):
        if self.pool is None:
            return
            
        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE learning_data
                    SET usage_count = usage_count + 1,
                        last_used = GETDATE()
                    WHERE question = ? AND language = ?
                """, (question, lang))

                conn.commit()
                cursor.close()
        except Exception as e:
            logger.error(f"Error incrementing usage count: {e}")

    def save_learning_data(
        self,
        question: str,
        answer: str,
        symptoms: List[str],
        category: str,
        language: str = "th",
        confidence_score: float = 0.0,
    ) -> bool:
        if not self.connection_available or self.pool is None:
            return False
            
        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()

                symptoms_json = json.dumps(symptoms, ensure_ascii=False) if symptoms else json.dumps([], ensure_ascii=False)

                cursor.execute("""
                    SELECT id FROM learning_data WHERE question = ? AND language = ?
                """, (question, language))
                
                existing = cursor.fetchone()

                if existing:
                    cursor.execute("""
                        UPDATE learning_data
                        SET answer = ?,
                            confidence_score = ?,
                            usage_count = usage_count + 1,
                            last_used = GETDATE()
                        WHERE question = ? AND language = ?
                    """, (answer, confidence_score, question, language))
                else:
                    cursor.execute("""
                        INSERT INTO learning_data (question, answer, symptoms, category, language, confidence_score)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (question, answer, symptoms_json, category, language, confidence_score))

                conn.commit()
                cursor.close()
            return True
        except Exception as e:
            msg = self.log_msgs.get("save_learning_data_failed", "Save learning data failed: {}")
            logger.warning(msg.format(e))
            return False

    def get_learned_patterns(self, category: Optional[str] = None, limit: int = 100) -> List[Dict]:
        if not self.connection_available or self.pool is None:
            return []
            
        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()

                if category:
                    cursor.execute("""
                        SELECT TOP (?) question, answer, symptoms, category, confidence_score, usage_count, created_at
                        FROM learning_data
                        WHERE category = ?
                        ORDER BY usage_count DESC, confidence_score DESC
                    """, (limit, category))
                else:
                    cursor.execute("""
                        SELECT TOP (?) question, answer, symptoms, category, confidence_score, usage_count, created_at
                        FROM learning_data
                        ORDER BY usage_count DESC, confidence_score DESC
                    """, (limit,))

                results = cursor.fetchall()
                cursor.close()

            patterns = []
            for row in results:
                patterns.append({
                    "question": row[0],
                    "answer": row[1] if len(row) > 1 else None,
                    "symptoms": self._safe_json_parse(row[2], default=[]) if len(row) > 2 else [],
                    "category": row[3] if len(row) > 3 else "unknown",
                    "confidence_score": row[4] if len(row) > 4 else 0.0,
                    "usage_count": row[5] if len(row) > 5 else 0,
                    "created_at": row[6].isoformat() if len(row) > 6 and row[6] else None,
                })

            return patterns
        except Exception as e:
            msg = self.log_msgs.get("get_learned_patterns_failed", "Get learned patterns failed: {}")
            logger.warning(msg.format(e))
            return []

    def search_similar_conversations(self, keywords: List[str], session_id: Optional[str] = None, limit: int = 10) -> List[Dict]:
        if not self.connection_available or not keywords or self.pool is None:
            return []
        
        keywords = [k.strip()[:MAX_KEYWORD_LENGTH] for k in keywords if k and k.strip()]
        keywords = keywords[:5]
        
        if not keywords:
            return []
            
        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()
                
                try:
                    keyword_conditions = []
                    params = []
                    
                    for keyword in keywords:
                        keyword_conditions.append("(user_message LIKE ? OR ai_response LIKE ?)")
                        search_term = f"%{keyword}%"
                        params.extend([search_term, search_term])
                    
                    where_clause = " OR ".join(keyword_conditions)
                    limit = max(1, min(limit, 50))
                    
                    if session_id:
                        query = f"""
                            SELECT TOP (?) user_message, ai_response, symptoms, language, created_at, confidence_score
                            FROM conversations
                            WHERE session_id = ? AND ({where_clause})
                            ORDER BY confidence_score DESC, created_at DESC
                        """
                        cursor.execute(query, [limit, session_id] + params)
                    else:
                        query = f"""
                            SELECT TOP (?) user_message, ai_response, symptoms, language, created_at, confidence_score
                            FROM conversations
                            WHERE {where_clause}
                            ORDER BY confidence_score DESC, created_at DESC
                        """
                        cursor.execute(query, [limit] + params)

                    results = cursor.fetchall()
                finally:
                    cursor.close()

            similar = []
            for row in results:
                try:
                    similar.append({
                        "user_message": row[0] or "",
                        "ai_response": row[1] or "",
                        "symptoms": self._safe_json_parse(row[2], default=[]),
                        "language": row[3] or "th",
                        "timestamp": row[4].isoformat() if row[4] else None,
                        "confidence_score": row[5] if len(row) > 5 else 0.0,
                    })
                except Exception as e:
                    logger.warning(f"Error parsing similar conversation: {e}")
                    continue

            return similar
            
        except Exception as e:
            logger.error(f"Failed to search similar conversations: {e}")
            return []

    def save_feedback(
        self,
        text: str,
        name: str = "Anonymous",
        rating: int = 0,
        comment: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        language: str = "th",
    ) -> Optional[Dict]:
        if not self.connection_available or self.pool is None:
            return None

        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()

                cursor.execute("""
                    INSERT INTO feedback (text, name, rating, comment, ip_address, user_agent, language)
                    OUTPUT INSERTED.id, INSERTED.timestamp
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (text, name, rating, comment, ip_address, user_agent, language))

                result = cursor.fetchone()
                if result is None:
                    return None
                feedback_id = result[0]
                timestamp = result[1]

                conn.commit()
                cursor.close()

            return {
                "id": feedback_id,
                "text": text,
                "name": name,
                "timestamp": timestamp.isoformat(),
            }
        except Exception as e:
            msg = self.log_msgs.get("save_feedback_failed", "Save feedback failed: {}")
            logger.warning(msg.format(e))
            return None

    def get_public_feedback(self, limit: int = 50) -> List[Dict]:
        if not self.connection_available or self.pool is None:
            return []
            
        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()

                cursor.execute("""
                    SELECT TOP (?) id, text, name, timestamp
                    FROM feedback
                    ORDER BY timestamp DESC
                """, (limit,))

                results = cursor.fetchall()
                cursor.close()

            feedback_list = []
            for row in results:
                feedback_list.append({
                    "id": row[0],
                    "text": row[1],
                    "name": row[2],
                    "timestamp": row[3].isoformat() if row[3] else None,
                })

            return feedback_list
        except Exception as e:
            msg = self.log_msgs.get("get_public_feedback_failed", "Get public feedback failed: {}")
            logger.warning(msg.format(e))
            return []

    def get_admin_feedback(self, limit: int = 100) -> List[Dict]:
        if not self.connection_available or self.pool is None:
            return []
            
        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()

                cursor.execute("""
                    SELECT TOP (?) id, text, name, ip_address, timestamp
                    FROM feedback
                    ORDER BY timestamp DESC
                """, (limit,))

                results = cursor.fetchall()
                cursor.close()

            feedback_list = []
            for row in results:
                feedback_list.append({
                    "id": row[0],
                    "text": row[1],
                    "name": row[2],
                    "ip_address": row[3],
                    "timestamp": row[4].isoformat() if row[4] else None,
                })

            return feedback_list
        except Exception as e:
            msg = self.log_msgs.get("get_admin_feedback_failed", "Get admin feedback failed: {}")
            logger.warning(msg.format(e))
            return []

    def delete_feedback(self, feedback_id: int) -> bool:
        if not self.connection_available or self.pool is None:
            return False
            
        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM feedback WHERE id = ?", (feedback_id,))
                conn.commit()
                affected = cursor.rowcount
                cursor.close()

            return affected > 0
        except Exception as e:
            msg = self.log_msgs.get("delete_feedback_failed", "Delete feedback failed: {}")
            logger.warning(msg.format(e))
            return False

    def get_symptom_analytics(self, days: int = 30, language: Optional[str] = None) -> List[Dict]:
        if not self.connection_available or self.pool is None:
            return []
            
        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()

                date_from = datetime.now() - timedelta(days=days)

                if language:
                    cursor.execute("""
                        SELECT symptoms, COUNT(*) as count
                        FROM learning_data
                        WHERE created_at >= ? AND language = ?
                        GROUP BY symptoms
                        ORDER BY count DESC
                    """, (date_from, language))
                else:
                    cursor.execute("""
                        SELECT symptoms, COUNT(*) as count
                        FROM learning_data
                        WHERE created_at >= ?
                        GROUP BY symptoms
                        ORDER BY count DESC
                    """, (date_from,))

                results = cursor.fetchall()
                cursor.close()

            analytics = []
            if results:
                for row in results:
                    symptoms = self._safe_json_parse(row[0], default=[])
                    if symptoms:
                        for symptom in symptoms:
                            analytics.append({"symptom": symptom, "count": row[1]})

            return analytics
        except Exception as e:
            msg = self.log_msgs.get("get_symptom_analytics_failed", "Get symptom analytics failed: {}")
            logger.warning(msg.format(e))
            return []

    def get_active_announcements(self, limit: int = 3) -> List[Dict]:
        """Get active announcements (max 3)"""
        if not self.connection_available or self.pool is None:
            return []

        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT TOP (?) id, title, image_filename, link_url, display_order
                    FROM announcements
                    WHERE is_active = 1
                    ORDER BY display_order ASC, created_at DESC
                """, (min(limit, 3),))

                results = cursor.fetchall()
                cursor.close()

            announcements = []
            for row in results:
                announcements.append({
                    "id": row[0],
                    "title": row[1],
                    "image_url": f"/maemi-chan/api/announcements/image/{row[2]}",
                    "link_url": row[3],
                    "display_order": row[4],
                })

            return announcements
        except Exception as e:
            logger.warning(f"Get active announcements failed: {e}")
            return []

    def get_all_announcements(self) -> List[Dict]:
        """Get all announcements for admin"""
        if not self.connection_available or self.pool is None:
            return []

        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, title, image_filename, link_url, display_order, is_active, created_at, updated_at
                    FROM announcements
                    ORDER BY display_order ASC, created_at DESC
                """)

                results = cursor.fetchall()
                cursor.close()

            announcements = []
            for row in results:
                announcements.append({
                    "id": row[0],
                    "title": row[1],
                    "image_url": f"/maemi-chan/api/announcements/image/{row[2]}",
                    "link_url": row[3],
                    "display_order": row[4],
                    "is_active": bool(row[5]),
                    "created_at": row[6].isoformat() if row[6] else None,
                    "updated_at": row[7].isoformat() if row[7] else None,
                })

            return announcements
        except Exception as e:
            logger.warning(f"Get all announcements failed: {e}")
            return []

    def create_announcement(self, title: str, image_filename: str, link_url: Optional[str] = None, display_order: int = 0) -> Optional[Dict]:
        """Create new announcement (max 3 total)"""
        if not self.connection_available or self.pool is None:
            return None

        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()

                # Check count
                cursor.execute("SELECT COUNT(*) FROM announcements")
                count_result = cursor.fetchone()
                if count_result is None:
                    return None
                count = count_result[0]

                if count >= 3:
                    logger.warning("Maximum 3 announcements allowed")
                    cursor.close()
                    return None

                cursor.execute("""
                    INSERT INTO announcements (title, image_filename, link_url, display_order)
                    OUTPUT INSERTED.id, INSERTED.created_at
                    VALUES (?, ?, ?, ?)
                """, (title, image_filename, link_url, display_order))

                result = cursor.fetchone()
                if result is None:
                    return None
                announcement_id = result[0]
                created_at = result[1]

                conn.commit()
                cursor.close()

            return {
                "id": announcement_id,
                "title": title,
                "image_url": f"/maemi-chan/api/announcements/image/{image_filename}",
                "link_url": link_url,
                "display_order": display_order,
                "is_active": True,
                "created_at": created_at.isoformat() if created_at else None,
            }
        except Exception as e:
            logger.warning(f"Create announcement failed: {e}")
            return None

    def update_announcement(self, announcement_id: int, title: Optional[str] = None, image_filename: Optional[str] = None,
                          link_url: Optional[str] = None, display_order: Optional[int] = None, is_active: Optional[bool] = None) -> bool:
        """Update announcement"""
        if not self.connection_available or self.pool is None:
            return False

        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()

                updates = []
                params = []

                if title is not None:
                    updates.append("title = ?")
                    params.append(title)
                if image_filename is not None:
                    updates.append("image_filename = ?")
                    params.append(image_filename)
                if link_url is not None:
                    updates.append("link_url = ?")
                    params.append(link_url)
                if display_order is not None:
                    updates.append("display_order = ?")
                    params.append(display_order)
                if is_active is not None:
                    updates.append("is_active = ?")
                    params.append(is_active)

                if not updates:
                    cursor.close()
                    return False

                updates.append("updated_at = GETDATE()")
                params.append(announcement_id)

                query = f"UPDATE announcements SET {', '.join(updates)} WHERE id = ?"
                cursor.execute(query, params)

                conn.commit()
                affected = cursor.rowcount
                cursor.close()

            return affected > 0
        except Exception as e:
            logger.warning(f"Update announcement failed: {e}")
            return False

    def get_announcement_filename(self, announcement_id: int) -> Optional[str]:
        """Get announcement image filename by ID"""
        if not self.connection_available or self.pool is None:
            return None

        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT image_filename FROM announcements WHERE id = ?", (announcement_id,))
                result = cursor.fetchone()
                cursor.close()

            return result[0] if result else None
        except Exception as e:
            logger.warning(f"Get announcement filename failed: {e}")
            return None

    def delete_announcement(self, announcement_id: int) -> bool:
        """Delete announcement"""
        if not self.connection_available or self.pool is None:
            return False

        try:
            with self.pool.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM announcements WHERE id = ?", (announcement_id,))
                conn.commit()
                affected = cursor.rowcount
                cursor.close()

            return affected > 0
        except Exception as e:
            logger.warning(f"Delete announcement failed: {e}")
            return False

    def close(self):
        if self.pool:
            try:
                self.pool.close_all()
                logger.info("Database connection pool closed")
            except Exception as e:
                logger.error(f"Error closing connection pool: {e}")