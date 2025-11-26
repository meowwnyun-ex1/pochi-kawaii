"""
Chibi Image Generation Service
Converts user photos into cute chibi-style cartoon characters using HuggingFace FLUX model
"""

import logging
import base64
import io
import os
import time
from typing import Optional, Tuple
from PIL import Image
import httpx

logger = logging.getLogger(__name__)


class ChibiImageService:
    """Service for generating chibi-style cartoon images from photos"""

    # Fixed prompt for consistent chibi style - NEVER changes regardless of input
    FIXED_CHIBI_PROMPT = """
    Create an adorable chibi-style cartoon character based on this photo.
    Style requirements:
    - Ultra cute kawaii chibi art style
    - Large sparkling eyes with highlights
    - Small simplified body proportions (head is 1/3 of total height)
    - Soft pastel colors (pink, lavender, white tones)
    - Japanese anime/manga aesthetic
    - Rounded, simplified features
    - Cheerful, friendly expression
    - Clean lineart with soft shading
    - White or soft pink background
    - Professional digital illustration quality

    The character should be recognizable from the original photo but transformed into
    an extremely cute, chibi-style cartoon with exaggerated cuteness.
    """

    def __init__(
        self,
        api_token: str,
        model_name: str = "black-forest-labs/FLUX.1-dev",
        base_url: str = "https://api-inference.huggingface.co/models",
        timeout: int = 120
    ):
        """
        Initialize the Chibi Image Service

        Args:
            api_token: HuggingFace API token
            model_name: Model to use for generation
            base_url: HuggingFace API base URL
            timeout: Request timeout in seconds
        """
        self.api_token = api_token
        self.model_name = model_name
        self.api_url = f"{base_url}/{model_name}"
        self.timeout = timeout

        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }

        logger.info(f"✅ ChibiImageService initialized with model: {model_name}")

    def _validate_image(self, image_data: bytes) -> Tuple[bool, Optional[str]]:
        """
        Validate uploaded image

        Args:
            image_data: Raw image bytes

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            # Try to open image
            img = Image.open(io.BytesIO(image_data))

            # Check format
            if img.format not in ['JPEG', 'PNG', 'WEBP']:
                return False, f"Unsupported format: {img.format}. Use JPG, PNG, or WEBP"

            # Check size (max 10MB)
            if len(image_data) > 10 * 1024 * 1024:
                return False, "Image too large (max 10MB)"

            # Check dimensions
            width, height = img.size
            if width < 100 or height < 100:
                return False, "Image too small (min 100x100px)"

            if width > 4096 or height > 4096:
                return False, "Image too large (max 4096x4096px)"

            return True, None

        except Exception as e:
            logger.error(f"Image validation error: {e}")
            return False, f"Invalid image file: {str(e)}"

    def _preprocess_image(self, image_data: bytes) -> bytes:
        """
        Preprocess image for optimal generation

        Args:
            image_data: Raw image bytes

        Returns:
            Processed image bytes
        """
        try:
            img = Image.open(io.BytesIO(image_data))

            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Resize if too large (keep aspect ratio)
            max_size = 1024
            if max(img.size) > max_size:
                img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                logger.info(f"Resized image to {img.size}")

            # Save to bytes
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=90, optimize=True)
            return output.getvalue()

        except Exception as e:
            logger.error(f"Image preprocessing error: {e}")
            return image_data  # Return original if preprocessing fails

    async def generate_chibi(
        self,
        image_data: bytes,
        session_id: str = "default"
    ) -> Tuple[Optional[bytes], Optional[str]]:
        """
        Generate chibi-style cartoon from photo

        Args:
            image_data: Input photo bytes
            session_id: Session identifier for logging

        Returns:
            Tuple of (generated_image_bytes, error_message)
        """
        logger.info(f"🎨 Starting chibi generation for session {session_id[:8]}...")

        # Validate image
        is_valid, error = self._validate_image(image_data)
        if not is_valid:
            logger.warning(f"❌ Image validation failed: {error}")
            return None, error

        # Preprocess image
        processed_image = self._preprocess_image(image_data)
        logger.info(f"✅ Image preprocessed ({len(processed_image)} bytes)")

        try:
            # Encode image to base64
            image_b64 = base64.b64encode(processed_image).decode('utf-8')

            # Prepare request payload
            payload = {
                "inputs": self.FIXED_CHIBI_PROMPT,
                "parameters": {
                    "image": image_b64,
                    "num_inference_steps": 50,
                    "guidance_scale": 7.5,
                    "width": 512,
                    "height": 512,
                }
            }

            # Call HuggingFace API
            logger.info(f"📡 Calling HuggingFace API: {self.api_url}")

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.api_url,
                    headers=self.headers,
                    json=payload
                )

            if response.status_code == 200:
                generated_image = response.content
                logger.info(f"✅ Chibi image generated successfully ({len(generated_image)} bytes)")
                return generated_image, None

            else:
                error_detail = response.text
                logger.error(f"❌ HuggingFace API error {response.status_code}: {error_detail}")

                if response.status_code == 503:
                    return None, "Model is loading, please try again in a moment"
                elif response.status_code == 401:
                    return None, "Invalid API token"
                elif response.status_code == 429:
                    return None, "Rate limit exceeded, please try again later"
                else:
                    return None, f"Generation failed: {error_detail[:200]}"

        except httpx.TimeoutException:
            logger.error("⏱️ Request timeout")
            return None, "Generation timeout - please try again"

        except Exception as e:
            logger.error(f"❌ Generation error: {e}", exc_info=True)
            return None, f"An error occurred: {str(e)}"

    def save_generated_image(
        self,
        image_data: bytes,
        session_id: str,
        output_dir: str = ".cache/generated"
    ) -> Optional[str]:
        """
        Save generated image to disk

        Args:
            image_data: Generated image bytes
            session_id: Session identifier
            output_dir: Output directory

        Returns:
            File path or None if failed
        """
        try:
            os.makedirs(output_dir, exist_ok=True)

            filename = f"chibi_{session_id}_{int(time.time())}.png"
            filepath = os.path.join(output_dir, filename)

            with open(filepath, 'wb') as f:
                f.write(image_data)

            logger.info(f"💾 Saved generated image: {filepath}")
            return filepath

        except Exception as e:
            logger.error(f"❌ Failed to save image: {e}")
            return None


# Example usage
if __name__ == "__main__":
    import asyncio
    import time

    # Test the service
    async def test():
        service = ChibiImageService(
            api_token="your_token_here"
        )

        # Load test image
        with open("test_photo.jpg", "rb") as f:
            image_data = f.read()

        # Generate chibi
        result, error = await service.generate_chibi(image_data, "test123")

        if result:
            print("✅ Success!")
            # Save result
            with open("output_chibi.png", "wb") as f:
                f.write(result)
        else:
            print(f"❌ Error: {error}")

    asyncio.run(test())
