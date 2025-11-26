from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import logging
import json
import os
from pathlib import Path
from middleware.rate_limiter import get_login_rate_limiter

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()

config_dir = Path(os.getenv("CONFIG_DIR") or "")
api_config_file = os.getenv("API_CONFIG_FILE") or ""
api_config_path = config_dir / api_config_file if config_dir and api_config_file else None

try:
    if api_config_path and api_config_path.exists():
        with open(api_config_path, "r", encoding="utf-8") as f:
            api_config = json.load(f)
        MESSAGES = api_config.get("response_messages", {})
        ERROR_MESSAGES = api_config.get("error_messages", {})
    else:
        MESSAGES = {
            "ok": "OK",
            "login_successful": "Login successful",
            "logout_successful": "Logout successful",
            "feedback_deleted": "Feedback deleted successfully",
            "cache_cleared": "Cache cleared successfully"
        }
        ERROR_MESSAGES = {
            "invalid_password": "Invalid password",
            "invalid_token": "Invalid or expired token",
            "login_failed": "Login failed",
            "logout_failed": "Logout failed",
            "get_feedback_failed": "Failed to get feedback",
            "delete_feedback_failed": "Failed to delete feedback",
            "clear_cache_failed": "Failed to clear cache",
            "feedback_not_found": "Feedback not found"
        }
except Exception as e:
    logger.warning(f"Could not load api_config.json: {api_config_path} ({e})")
    MESSAGES = {
        "ok": "OK",
        "login_successful": "Login successful",
        "logout_successful": "Logout successful",
        "feedback_deleted": "Feedback deleted successfully",
        "cache_cleared": "Cache cleared successfully"
    }
    ERROR_MESSAGES = {
        "invalid_password": "Invalid password",
        "invalid_token": "Invalid or expired token",
        "login_failed": "Login failed",
        "logout_failed": "Logout failed",
        "get_feedback_failed": "Failed to get feedback",
        "delete_feedback_failed": "Failed to delete feedback",
        "clear_cache_failed": "Failed to clear cache",
        "feedback_not_found": "Feedback not found"
    }


class AdminLoginRequest(BaseModel):
    password: str


class AdminToken(BaseModel):
    access_token: str
    token_type: str = "bearer"


def setup_admin_routes(app, auth_service, feedback_service, cache_service, ai_service=None):
    def verify_admin_token(
        credentials: HTTPAuthorizationCredentials = Depends(security),
    ):
        payload = auth_service.verify_token(credentials.credentials)
        if not payload:
            raise HTTPException(status_code=401, detail=ERROR_MESSAGES.get("invalid_token", "Invalid or expired token"))
        return payload

    @router.options("/api/admin/login")
    async def admin_login_options():
        return {"message": MESSAGES.get("ok", "OK")}

    @router.post("/api/admin/login", response_model=AdminToken)
    async def admin_login(login: AdminLoginRequest, request: Request):
        try:
            # Get client IP
            client_ip = request.client.host if request.client else "unknown"
            if not client_ip or client_ip == "unknown":
                client_ip = request.headers.get("X-Forwarded-For", "unknown")

            # Check login rate limit
            login_limiter = get_login_rate_limiter()
            allowed, remaining = login_limiter.check_login_attempt(client_ip)

            if not allowed:
                lockout_time = login_limiter.get_lockout_time(client_ip)
                logger.warning(
                    f"Login blocked for {client_ip}: too many failed attempts, "
                    f"{lockout_time:.0f}s remaining"
                )
                raise HTTPException(
                    status_code=429,
                    detail=f"Too many login attempts. Please try again in {int(lockout_time / 60)} minutes.",
                    headers={"Retry-After": str(int(lockout_time) + 1)}
                )

            # Verify password
            if not auth_service.verify_admin_password(login.password):
                msg = ERROR_MESSAGES.get("invalid_admin_login", "Invalid admin login attempt")
                logger.warning(f"{msg} from {client_ip} ({remaining} attempts remaining)")
                raise HTTPException(
                    status_code=401,
                    detail=ERROR_MESSAGES.get("invalid_password", "Invalid password")
                )

            # Successful login - reset attempts
            login_limiter.reset_attempts(client_ip)

            token = auth_service.generate_token()
            msg = MESSAGES.get("admin_login_successful", "Admin login successful")
            logger.info(f"{msg} from {client_ip}")
            return AdminToken(access_token=token)

        except HTTPException:
            raise
        except Exception as e:
            msg = ERROR_MESSAGES.get("admin_login_error", "Admin login error: {}")
            logger.error(msg.format(e))
            raise HTTPException(status_code=500, detail=ERROR_MESSAGES.get("login_failed", "Login failed"))

    @router.post("/api/admin/logout")
    async def admin_logout(admin_data: dict = Depends(verify_admin_token)):
        try:
            msg = MESSAGES.get("admin_logout_successful", "Admin logout successful")
            logger.info(msg)
            return {"message": MESSAGES.get("logout_successful", "Logout successful")}
        except Exception as e:
            msg = ERROR_MESSAGES.get("admin_logout_error", "Admin logout error: {}")
            logger.error(msg.format(e))
            raise HTTPException(status_code=500, detail=ERROR_MESSAGES.get("logout_failed", "Logout failed"))

    @router.get("/api/admin/feedback")
    async def get_all_feedback(admin_data: dict = Depends(verify_admin_token), limit: int = 100):
        try:
            feedback_list = feedback_service.get_admin_feedback(limit)
            return {"feedback": feedback_list, "total": len(feedback_list)}
        except Exception as e:
            logger.error(f"Failed to get feedback for admin: {e}")
            raise HTTPException(status_code=500, detail=ERROR_MESSAGES.get("get_feedback_failed", "Failed to get feedback"))

    @router.delete("/api/admin/feedback/{feedback_id}")
    async def delete_feedback(feedback_id: int, admin_data: dict = Depends(verify_admin_token)):
        try:
            success = feedback_service.delete_feedback(feedback_id)

            if not success:
                raise HTTPException(status_code=404, detail=ERROR_MESSAGES.get("feedback_not_found", "Feedback not found"))

            return {"message": MESSAGES.get("feedback_deleted", "Feedback deleted successfully")}

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to delete feedback: {e}")
            raise HTTPException(status_code=500, detail=ERROR_MESSAGES.get("delete_feedback_failed", "Failed to delete feedback"))

    @router.post("/api/admin/cache/clear")
    async def clear_cache(admin_data: dict = Depends(verify_admin_token)):
        try:
            cache_service.clear()
            return {"message": MESSAGES.get("cache_cleared", "Cache cleared successfully")}
        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")
            raise HTTPException(status_code=500, detail=ERROR_MESSAGES.get("clear_cache_failed", "Failed to clear cache"))

    @router.post("/api/admin/learn-from-database")
    async def learn_from_database(limit: int = 100, admin_data: dict = Depends(verify_admin_token)):
        """
        เรียนรู้จากการสนทนาที่มีอยู่ใน database
        AI will analyze existing conversations and improve its responses
        """
        try:
            if not ai_service:
                raise HTTPException(status_code=503, detail="AI service not available")

            if not hasattr(ai_service, 'learning_service') or not ai_service.learning_service:
                raise HTTPException(status_code=503, detail="Learning service not available")

            # Call learning service to learn from database
            stats = ai_service.learning_service.learn_from_database_conversations(limit=limit)

            return {
                "success": True,
                "message": f"AI learned from {stats.get('learned', 0)} conversations",
                "stats": stats
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to learn from database: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to learn from database: {str(e)}")

    @router.get("/api/admin/learning-stats")
    async def get_learning_stats(admin_data: dict = Depends(verify_admin_token)):
        """Get AI learning statistics"""
        try:
            if not ai_service:
                raise HTTPException(status_code=503, detail="AI service not available")

            if not hasattr(ai_service, 'learning_service') or not ai_service.learning_service:
                raise HTTPException(status_code=503, detail="Learning service not available")

            stats = ai_service.learning_service.get_learning_stats()

            return {
                "success": True,
                "stats": stats
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get learning stats: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get learning stats: {str(e)}")

    app.include_router(router)
