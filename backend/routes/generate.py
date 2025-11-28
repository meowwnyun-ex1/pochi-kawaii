import logging
import uuid
import base64
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["generate"])

image_service = None
api_config = None


class GenerateResponse(BaseModel):
    image_url: str
    session_id: str
    success: bool = True
    message: str = ""


def setup_generate_routes(app, image_generation_service, config=None):
    global image_service, api_config
    image_service = image_generation_service
    if config:
        api_config = config.api_config

    @router.post("/generate/image", response_model=GenerateResponse)
    async def generate_image(
        file: UploadFile = File(...),
        session_id: Optional[str] = Form(None),
        style: Optional[str] = Form('anime')
    ):
        if not image_service:
            logger.error("❌ Image service not initialized")
            error_msgs = api_config.get("error_messages", {}) if api_config else {}
            detail_msg = error_msgs.get("image_service_unavailable", "Image generation service is not available. Please try again later.")
            raise HTTPException(
                status_code=503,
                detail=detail_msg
            )

        if not session_id:
            session_id = str(uuid.uuid4())
        logger.info(f"📸 Received image generation request")
        logger.info(f"   Session: {session_id[:8]}...")
        logger.info(f"   File: {file.filename} ({file.content_type})")
        logger.info(f"   Style: {style}")
        try:
            if file.content_type not in ['image/jpeg', 'image/png', 'image/webp']:
                error_msgs = api_config.get("error_messages", {}) if api_config else {}
                detail_template = error_msgs.get("invalid_file_type", "Invalid file type: {type}. Please upload JPG, PNG, or WEBP")
                detail_msg = detail_template.format(type=file.content_type)
                raise HTTPException(
                    status_code=400,
                    detail=detail_msg
                )
            image_data = await file.read()
            file_size_mb = len(image_data) / (1024 * 1024)
            logger.info(f"   Size: {file_size_mb:.2f} MB")
            if file_size_mb > 10:
                error_msgs = api_config.get("error_messages", {}) if api_config else {}
                detail_msg = error_msgs.get("file_too_large", "File too large. Maximum size is 10MB")
                raise HTTPException(
                    status_code=400,
                    detail=detail_msg
                )
            logger.info(f"🎨 Generating image...")
            generated_image, error = await image_service.generate_image(
                image_data=image_data,
                session_id=session_id,
                style=style
            )
            if error:
                logger.error(f"❌ Generation failed: {error}")
                raise HTTPException(
                    status_code=500,
                    detail=error
                )
            if not generated_image:
                logger.error("❌ No image returned from service")
                error_msgs = api_config.get("error_messages", {}) if api_config else {}
                detail_msg = error_msgs.get("generation_failed", "Image generation failed - no output received")
                raise HTTPException(
                    status_code=500,
                    detail=detail_msg
                )
            image_b64 = base64.b64encode(generated_image).decode('utf-8')
            image_data_url = f"data:image/png;base64,{image_b64}"
            logger.info(f"✅ Image generated successfully!")
            logger.info(f"   Output size: {len(generated_image) / 1024:.2f} KB")

            response_msgs = api_config.get("response_messages", {}) if api_config else {}
            message = response_msgs.get("image_ready", "Image generated successfully")
            return GenerateResponse(
                image_url=image_data_url,
                session_id=session_id,
                message=message
            )

        except HTTPException:
            raise

        except Exception as e:
            logger.error(f"❌ Unexpected error: {e}", exc_info=True)
            error_msgs = api_config.get("error_messages", {}) if api_config else {}
            detail_template = error_msgs.get("unexpected_error", "An unexpected error occurred")
            detail_msg = detail_template
            if "{error}" in detail_template:
                detail_msg = detail_template.format(error=str(e))
            raise HTTPException(
                status_code=500,
                detail=detail_msg
            )

    @router.get("/generate/status")
    async def get_generation_status():
        startup_msgs = api_config.get("startup_messages", {}) if api_config else {}
        if not image_service:
            not_init_msg = startup_msgs.get("image_service_not_initialized", "Image generation service not initialized")
            return {
                "available": False,
                "message": not_init_msg
            }

        ready_msg = startup_msgs.get("image_generation_ready", "Image generation service ready! 🎨")
        return {
            "available": True,
            "model": image_service.model_name,
            "message": ready_msg
        }

    app.include_router(router)
    logger.info("✅ Image generation routes registered")
