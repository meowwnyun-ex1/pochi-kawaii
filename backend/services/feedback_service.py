from typing import Dict, List, Optional, TYPE_CHECKING
import logging
import json
import os
from pathlib import Path

if TYPE_CHECKING:
    from database import DatabaseManager

logger = logging.getLogger(__name__)


class FeedbackService:
    def __init__(self, database_manager: "DatabaseManager"):
        self.db = database_manager
        config_dir_str = os.getenv("CONFIG_DIR")
        if config_dir_str:
            config_dir = Path(config_dir_str)
        else:
            config_dir = Path(__file__).parent.parent / "config"

        api_config_file = os.getenv("API_CONFIG_FILE")
        if not api_config_file:
            api_config_file = "api_config.json"
        api_config_path = config_dir / api_config_file

        try:
            if api_config_path and api_config_path.exists():
                with open(api_config_path, "r", encoding="utf-8") as f:
                    api_config = json.load(f)
                self.log_msgs = api_config.get("log_messages", {})
                self.error_msgs = api_config.get("error_messages", {})
            else:
                self.log_msgs = {}
                self.error_msgs = {}
        except Exception as e:
            logger.warning(f"Could not load api_config.json: {api_config_path} ({e})")
            self.log_msgs = {}
            self.error_msgs = {}

    def submit_feedback(
        self,
        text: str,
        name: str,
        rating: int,
        comment: str,
        ip_address: str,
        user_agent: str,
        language: str = "en",
    ) -> Optional[Dict]:
        try:
            if not comment or len(comment.strip()) == 0:
                return None

            result = self.db.save_feedback(
                text=text.strip(),
                name=name.strip() if name else "Anonymous",
                rating=rating,
                comment=comment.strip(),
                ip_address=ip_address,
                user_agent=user_agent,
                language=language,
            )

            if result:
                msg = self.log_msgs.get("feedback_submitted_successfully", "Feedback submitted successfully: ID {}")
                logger.info(msg.format(result))
                return result
            return None
        except Exception as e:
            msg = self.error_msgs.get("feedback_submit_error", "Error submitting feedback: {}")
            logger.error(msg.format(e))
            return None

    def get_public_feedback(self, limit: int = 50) -> List[Dict]:
        try:
            feedback_list = self.db.get_public_feedback(limit)
            msg = self.log_msgs.get("feedback_retrieved", "Retrieved {} public feedback items")
            logger.info(msg.format(len(feedback_list)))
            return feedback_list
        except Exception as e:
            msg = self.log_msgs.get("feedback_get_error", "Error getting public feedback: {}")
            logger.error(msg.format(e))
            return []

    def get_admin_feedback(self, limit: int = 100) -> List[Dict]:
        try:
            feedback_list = self.db.get_admin_feedback(limit)
            msg = self.log_msgs.get("admin_feedback_retrieved", "Retrieved {} admin feedback items")
            logger.info(msg.format(len(feedback_list)))
            return feedback_list
        except Exception as e:
            msg = self.log_msgs.get("admin_feedback_get_error", "Error getting admin feedback: {}")
            logger.error(msg.format(e))
            return []

    def delete_feedback(self, feedback_id: int) -> bool:
        try:
            success = self.db.delete_feedback(feedback_id)
            if success:
                msg = self.log_msgs.get("feedback_deleted_success", "Feedback {} deleted successfully")
                logger.info(msg.format(feedback_id))
            else:
                msg = self.log_msgs.get("feedback_delete_failed", "Failed to delete feedback {}")
                logger.warning(msg.format(feedback_id))
            return success
        except Exception as e:
            msg = self.log_msgs.get("feedback_delete_error", "Error deleting feedback {}: {}")
            logger.error(msg.format(feedback_id, e))
            return False