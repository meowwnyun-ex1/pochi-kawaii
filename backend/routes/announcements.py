import logging
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

logger = logging.getLogger(__name__)
security = HTTPBearer()

# Path to store announcement images
ANNOUNCEMENTS_DIR = Path(__file__).parent.parent / "static" / "announcements"
ANNOUNCEMENTS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


def setup_announcement_routes(app, db_manager, auth_service):
    router = APIRouter(prefix="/api/announcements", tags=["announcements"])

    def verify_admin_token(
        credentials: HTTPAuthorizationCredentials = Depends(security),
    ):
        """Verify admin JWT token"""
        payload = auth_service.verify_token(credentials.credentials)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        return payload

    @router.get("/active")
    async def get_active_announcements():
        """Get active announcements for public display (max 3)"""
        try:
            announcements = db_manager.get_active_announcements(limit=3)
            return {"announcements": announcements}
        except Exception as e:
            logger.error(f"Get active announcements failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve announcements"
            )

    @router.get("/image/{filename}")
    async def get_announcement_image(filename: str):
        """Serve announcement image"""
        try:
            file_path = ANNOUNCEMENTS_DIR / filename
            if not file_path.exists():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Image not found"
                )

            return FileResponse(file_path)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Serve image failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to serve image"
            )

    @router.get("/admin/all")
    async def get_all_announcements_admin(token: dict = Depends(verify_admin_token)):
        """Get all announcements (admin only)"""
        try:
            announcements = db_manager.get_all_announcements()
            return {"announcements": announcements}
        except Exception as e:
            logger.error(f"Get all announcements failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve announcements"
            )

    @router.post("/admin/create")
    async def create_announcement(
        title: Optional[str] = Form(None),
        link_url: Optional[str] = Form(None),
        display_order: int = Form(0),
        image: UploadFile = File(...),
        token: dict = Depends(verify_admin_token)
    ):
        """Create new announcement (admin only, max 3 total)"""
        try:
            # Check current count
            existing = db_manager.get_all_announcements()
            if len(existing) >= 3:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Maximum 3 announcements allowed. Please delete an existing one first."
                )

            # Validate image
            if image.content_type not in ALLOWED_IMAGE_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid image type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}"
                )

            # Read and check size
            image_data = await image.read()
            if len(image_data) > MAX_IMAGE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Image too large. Maximum size: {MAX_IMAGE_SIZE / 1024 / 1024}MB"
                )

            # Generate unique filename
            file_ext = Path(image.filename).suffix or ".jpg"
            unique_filename = f"{uuid.uuid4()}{file_ext}"
            file_path = ANNOUNCEMENTS_DIR / unique_filename

            # Save file
            with open(file_path, "wb") as f:
                f.write(image_data)

            # Create database record
            result = db_manager.create_announcement(
                title=title,
                image_filename=unique_filename,
                link_url=link_url,
                display_order=display_order
            )

            if result:
                return {"success": True, "announcement": result}
            else:
                # Clean up file if database insert failed
                if file_path.exists():
                    os.remove(file_path)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create announcement"
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Create announcement failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )

    @router.put("/admin/{announcement_id}")
    async def update_announcement(
        announcement_id: int,
        title: Optional[str] = Form(None),
        link_url: Optional[str] = Form(None),
        display_order: Optional[int] = Form(None),
        is_active: Optional[bool] = Form(None),
        image: Optional[UploadFile] = File(None),
        token: dict = Depends(verify_admin_token)
    ):
        """Update announcement (admin only)"""
        try:
            image_filename = None

            # If new image provided, validate and save it
            if image:
                if image.content_type not in ALLOWED_IMAGE_TYPES:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid image type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}"
                    )

                image_data = await image.read()
                if len(image_data) > MAX_IMAGE_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Image too large. Maximum size: {MAX_IMAGE_SIZE / 1024 / 1024}MB"
                    )

                # Generate unique filename
                file_ext = Path(image.filename).suffix or ".jpg"
                unique_filename = f"{uuid.uuid4()}{file_ext}"
                file_path = ANNOUNCEMENTS_DIR / unique_filename

                # Save new file (เก็บรูปเก่าไว้ ไม่ลบ)
                with open(file_path, "wb") as f:
                    f.write(image_data)

                image_filename = unique_filename

            success = db_manager.update_announcement(
                announcement_id=announcement_id,
                title=title,
                image_filename=image_filename,
                link_url=link_url,
                display_order=display_order,
                is_active=is_active
            )

            if success:
                return {"success": True}
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Announcement not found"
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Update announcement failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )

    @router.delete("/admin/{announcement_id}")
    async def delete_announcement(
        announcement_id: int,
        token: dict = Depends(verify_admin_token)
    ):
        """Delete announcement (admin only)"""
        try:
            # Get filename before deleting from database
            filename = db_manager.get_announcement_filename(announcement_id)

            success = db_manager.delete_announcement(announcement_id)

            if success:
                # Delete image file
                if filename:
                    file_path = ANNOUNCEMENTS_DIR / filename
                    if file_path.exists():
                        try:
                            os.remove(file_path)
                        except Exception as e:
                            logger.warning(f"Failed to delete image file: {e}")

                return {"success": True}
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Announcement not found"
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Delete announcement failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )

    app.include_router(router)
    logger.info("✅ Announcement routes initialized")
