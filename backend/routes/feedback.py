from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging
import json
import os
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter()

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
        MESSAGES = {"ok": "OK"}
        ERROR_MESSAGES = {
            "invalid_feedback": "Invalid feedback data",
            "save_feedback_failed": "Failed to save feedback",
            "get_feedback_failed": "Failed to get feedback"
        }
except Exception as e:
    logger.warning(f"Could not load api_config.json: {api_config_path} ({e})")
    MESSAGES = {"ok": "OK"}
    ERROR_MESSAGES = {
        "invalid_feedback": "Invalid feedback data",
        "save_feedback_failed": "Failed to save feedback",
        "get_feedback_failed": "Failed to get feedback"
    }


class FeedbackRequest(BaseModel):
    name: Optional[str] = "Anonymous"
    rating: int
    comment: str
    language: Optional[str] = "en"


class FeedbackResponse(BaseModel):
    id: int
    text: str
    name: str
    timestamp: str


def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    return (
        request.client.host
        if hasattr(request, "client") and request.client
        else "unknown"
    )


def setup_feedback_routes(app, feedback_service):
    @router.options("/api/feedback")
    async def feedback_options():
        return {"message": MESSAGES.get("ok", "OK")}

    @router.post("/api/feedback", response_model=FeedbackResponse)
    async def submit_feedback(feedback: FeedbackRequest, request: Request):
        try:
            client_ip = get_client_ip(request)
            user_agent = str(request.headers.get("user-agent", ""))

            result = feedback_service.submit_feedback(
                text=feedback.comment,
                name=feedback.name,
                rating=feedback.rating,
                comment=feedback.comment,
                ip_address=client_ip,
                user_agent=user_agent,
                language=feedback.language or "en",
            )

            if not result:
                raise HTTPException(status_code=400, detail=ERROR_MESSAGES.get("invalid_feedback", "Invalid feedback data"))

            return FeedbackResponse(**result)

        except Exception as e:
            logger.error(f"Failed to save feedback: {e}")
            raise HTTPException(status_code=500, detail=f"{ERROR_MESSAGES.get('save_feedback_failed', 'Failed to save feedback')}: {str(e)}")

    @router.get("/api/feedback")
    async def get_feedback(limit: int = 50):
        try:
            feedback_list = feedback_service.get_public_feedback(limit)
            return {
                "feedback": feedback_list,
                "total": len(feedback_list),
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error(f"Failed to get feedback: {e}")
            raise HTTPException(status_code=500, detail=ERROR_MESSAGES.get("get_feedback_failed", "Failed to get feedback"))

    app.include_router(router)