"""
Image Generation Routes
Handles chibi-style cartoon image generation from user photos
"""

import logging
import uuid
import base64
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

# Will be set during setup
chibi_service = None


class GenerateResponse(BaseModel):
    """Response model for image generation"""
    image_url: str
    session_id: str
    success: bool = True
    message: str = "Image generated successfully"


def setup_generate_routes(app, chibi_image_service):
    """
    Setup image generation routes

    Args:
        app: FastAPI application instance
        chibi_image_service: Instance of ChibiImageService
    """
    global chibi_service
    chibi_service = chibi_image_service

    @router.post("/generate/chibi", response_model=GenerateResponse)
    async def generate_chibi_image(
        file: UploadFile = File(...),
        session_id: Optional[str] = Form(None)
    ):
        """
        Generate chibi-style cartoon from uploaded photo

        Args:
            file: Uploaded image file (JPG, PNG, WEBP)
            session_id: Optional session ID for tracking

        Returns:
            GenerateResponse with base64 encoded image
        """
        # Generate session ID if not provided
        if not session_id:
            session_id = str(uuid.uuid4())

        logger.info(f"📸 Received chibi generation request")
        logger.info(f"   Session: {session_id[:8]}...")
        logger.info(f"   File: {file.filename} ({file.content_type})")

        try:
            # Validate file type
            if file.content_type not in ['image/jpeg', 'image/png', 'image/webp']:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file type: {file.content_type}. Please upload JPG, PNG, or WEBP"
                )

            # Read file content
            image_data = await file.read()
            file_size_mb = len(image_data) / (1024 * 1024)

            logger.info(f"   Size: {file_size_mb:.2f} MB")

            if file_size_mb > 10:
                raise HTTPException(
                    status_code=400,
                    detail="File too large. Maximum size is 10MB"
                )

            # Generate chibi image
            logger.info(f"🎨 Generating chibi image...")

            generated_image, error = await chibi_service.generate_chibi(
                image_data=image_data,
                session_id=session_id
            )

            if error:
                logger.error(f"❌ Generation failed: {error}")
                raise HTTPException(
                    status_code=500,
                    detail=error
                )

            if not generated_image:
                logger.error("❌ No image returned from service")
                raise HTTPException(
                    status_code=500,
                    detail="Image generation failed - no output received"
                )

            # Convert to base64 for JSON response
            image_b64 = base64.b64encode(generated_image).decode('utf-8')
            image_data_url = f"data:image/png;base64,{image_b64}"

            logger.info(f"✅ Chibi generated successfully!")
            logger.info(f"   Output size: {len(generated_image) / 1024:.2f} KB")

            return GenerateResponse(
                image_url=image_data_url,
                session_id=session_id,
                message="ภาพจิบิของคุณพร้อมแล้วค่ะ! 🌸"
            )

        except HTTPException:
            raise

        except Exception as e:
            logger.error(f"❌ Unexpected error: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"An unexpected error occurred: {str(e)}"
            )

    @router.get("/generate/status")
    async def get_generation_status():
        """
        Check if generation service is available

        Returns:
            Service status information
        """
        if not chibi_service:
            return {
                "available": False,
                "message": "Chibi image service not initialized"
            }

        return {
            "available": True,
            "model": chibi_service.model_name,
            "message": "Chibi generation service ready! 🎨"
        }

    app.include_router(router)
    logger.info("✅ Image generation routes registered")
