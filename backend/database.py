import logging
import json
from pathlib import Path
from typing import List, Dict, Optional
from services.connection_pool import ConnectionPool

logger = logging.getLogger(__name__)


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
                    "image_url": f"/pochi-kawaii/api/announcements/image/{row[2]}",
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
                    "image_url": f"/pochi-kawaii/api/announcements/image/{row[2]}",
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
                "image_url": f"/pochi-kawaii/api/announcements/image/{image_filename}",
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