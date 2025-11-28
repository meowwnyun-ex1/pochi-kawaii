import logging
import io
import os
import time
import asyncio
from typing import Optional, Tuple, Dict, Any
from PIL import Image
from huggingface_hub import InferenceClient

logger = logging.getLogger(__name__)


class ImageService:
    STYLE_PROMPTS = {
        'anime': """
        Create a cartoon-style portrait of the person in the uploaded photo: Keep the same outfit and pose as in the original image. Use a clean white background. The style should be semi-realistic or stylized cartoon, but the facial features and clothing must closely resemble the original photo.
        """,
        'watercolor': """
        Paint a new portrait of me in a watercolor cartoon style, keeping the facial and outfits' structure similar to the original. Use soft, gentle colors and a white background.
        """,
        'classic': """
        Transform this photo into an adorable cartoon character.
        
        Style requirements:
        - Cute cartoon style, cheerful and bright expression
        - Face should look as similar as possible to the original photo
        - Wear a cream-colored polo shirt
        - Shirt collar and sleeve cuffs are blue
        - DENSO logo on the left chest of the shirt, text in red color
        - Pants same color as the shirt (cream color)
        - Half-body portrait, pants edge not visible
        - Large sparkling eyes with highlights
        - Small simplified body proportions (head is 1/3 of total height)
        - Japanese anime/manga aesthetic
        - Rounded, simplified features
        - Cheerful, friendly expression
        - Clean lineart with soft shading
        - White or soft pink background
        - Professional digital illustration quality

        The character should be recognizable from the original photo but transformed into
        an extremely cute cartoon with the specified uniform and logo.
        """,
    }

    def _get_prompt_for_style(self, style: str) -> str:
        prompt = self.STYLE_PROMPTS.get(style)
        if not prompt:
            prompt = self.STYLE_PROMPTS['anime']
        return prompt.strip()

    def __init__(
        self,
        api_token: str,
        model_name: str = "Qwen/Qwen-Image-Edit",
        timeout: int = 120,
        api_config: Optional[Dict[str, Any]] = None
    ):
        self.api_token = api_token
        self.model_name = model_name
        self.timeout = timeout
        self.api_config = api_config
        self.client = InferenceClient(
            provider="auto",
            api_key=api_token,
        )
        logger.info(f"✅ ImageService initialized with model: {model_name}")

    def _get_error_message(self, key: str, **kwargs) -> str:
        if self.api_config:
            error_msgs = self.api_config.get("error_messages", {})
            template = error_msgs.get(key, "")
            if template and kwargs:
                try:
                    return template.format(**kwargs)
                except:
                    return template
            if template:
                return template
        return key

    def _validate_image(self, image_data: bytes) -> Tuple[bool, Optional[str]]:
        try:
            img = Image.open(io.BytesIO(image_data))
            if img.format not in ['JPEG', 'PNG', 'WEBP']:
                return False, self._get_error_message("unsupported_format", format=img.format)
            if len(image_data) > 10 * 1024 * 1024:
                return False, self._get_error_message("image_too_large")
            width, height = img.size
            if width < 100 or height < 100:
                return False, self._get_error_message("image_too_small")
            if width > 4096 or height > 4096:
                return False, self._get_error_message("image_too_large_dimensions")
            return True, None
        except Exception as e:
            logger.error(f"Image validation error: {e}")
            return False, self._get_error_message("invalid_image_file", error=str(e))

    def _preprocess_image(self, image_data: bytes) -> bytes:
        try:
            img = Image.open(io.BytesIO(image_data))
            if img.mode != 'RGB':
                img = img.convert('RGB')
            max_size = 1024
            if max(img.size) > max_size:
                img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                logger.info(f"Resized image to {img.size}")
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=90, optimize=True)
            return output.getvalue()
        except Exception as e:
            logger.error(f"Image preprocessing error: {e}")
            return image_data

    async def generate_image(
        self,
        image_data: bytes,
        session_id: str = "default",
        style: str = "anime"
    ) -> Tuple[Optional[bytes], Optional[str]]:
        logger.info(f"🎨 Starting image generation for session {session_id[:8]}...")
        logger.info(f"   Style: {style}")
        is_valid, error = self._validate_image(image_data)
        if not is_valid:
            logger.warning(f"❌ Image validation failed: {error}")
            return None, error
        processed_image = self._preprocess_image(image_data)
        logger.info(f"✅ Image preprocessed ({len(processed_image)} bytes)")
        try:
            prompt = self._get_prompt_for_style(style)
            logger.info(f"📡 Calling HuggingFace API")
            logger.info(f"   Model: {self.model_name}")
            logger.info(f"   Prompt: {prompt[:100]}...")
            
            def _generate():
                return self.client.image_to_image(
                    processed_image,
                    prompt=prompt,
                    model=self.model_name,
                )
            
            image = await asyncio.to_thread(_generate)
            
            if image:
                output = io.BytesIO()
                image.save(output, format='PNG')
                generated_image = output.getvalue()
                logger.info(f"✅ Image generated successfully ({len(generated_image)} bytes)")
                return generated_image, None
            else:
                return None, self._get_error_message("no_image_returned")
                
        except Exception as e:
            logger.error(f"❌ Generation error: {e}", exc_info=True)
            error_msg = str(e)
            if "402" in error_msg or "payment required" in error_msg.lower():
                return None, self._get_error_message("payment_required")
            elif "timeout" in error_msg.lower():
                return None, self._get_error_message("generation_timeout")
            elif "401" in error_msg or "unauthorized" in error_msg.lower():
                return None, self._get_error_message("invalid_api_token")
            elif "429" in error_msg or "rate limit" in error_msg.lower():
                return None, self._get_error_message("rate_limit_exceeded")
            elif "503" in error_msg or "loading" in error_msg.lower():
                return None, self._get_error_message("model_loading")
            else:
                error_template = self._get_error_message("generic_error")
                if "{error}" in error_template:
                    return None, error_template.format(error=error_msg[:200])
                return None, error_template

    def save_generated_image(
        self,
        image_data: bytes,
        session_id: str,
        output_dir: str = ".cache/generated"
    ) -> Optional[str]:
        try:
            os.makedirs(output_dir, exist_ok=True)
            filename = f"image_{session_id}_{int(time.time())}.png"
            filepath = os.path.join(output_dir, filename)
            with open(filepath, 'wb') as f:
                f.write(image_data)
            logger.info(f"💾 Saved generated image: {filepath}")
            return filepath
        except Exception as e:
            logger.error(f"❌ Failed to save image: {e}")
            return None

