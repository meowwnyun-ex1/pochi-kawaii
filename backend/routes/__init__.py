from .chat import setup_chat_routes
from .feedback import setup_feedback_routes
from .admin import setup_admin_routes
from .health import setup_health_routes

__all__ = [
    "setup_chat_routes",
    "setup_feedback_routes",
    "setup_admin_routes",
    "setup_health_routes",
]