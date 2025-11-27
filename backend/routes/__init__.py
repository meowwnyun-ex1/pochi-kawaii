from .feedback import setup_feedback_routes
from .admin import setup_admin_routes
from .health import setup_health_routes
from .announcements import setup_announcement_routes

__all__ = [
    "setup_feedback_routes",
    "setup_admin_routes",
    "setup_health_routes",
    "setup_announcement_routes",
]