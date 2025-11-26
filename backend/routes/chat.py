import asyncio
import json
import logging
import re
import uuid
from typing import AsyncGenerator, Optional, List

from fastapi import APIRouter, Request, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, validator

logger = logging.getLogger(__name__)

router = APIRouter()

# Bug #16 fix - Group message length constants together at the top
MAX_MESSAGE_LENGTH = 5000
MIN_MESSAGE_LENGTH = 1
MAX_FILES_LIMIT = 10  # Maximum number of files allowed per upload

# UUID v4 validation pattern
UUID_PATTERN = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    re.IGNORECASE
)


def validate_session_id(session_id: str) -> bool:
    """
    Validate session ID format (must be valid UUID v4)

    Args:
        session_id: Session ID to validate

    Returns:
        bool: True if valid UUID format
    """
    if not session_id or not isinstance(session_id, str):
        return False

    # Check length (UUID v4 is 36 characters with dashes)
    if len(session_id) != 36:
        return False

    # Validate UUID format
    return bool(UUID_PATTERN.match(session_id))


def get_or_create_session_id(session_id: Optional[str]) -> str:
    """
    Get existing session ID or create new one

    Args:
        session_id: Optional session ID from client

    Returns:
        str: Valid session ID (UUID v4)
    """
    if session_id:
        session_id = session_id.strip()

        # Validate session ID format
        if validate_session_id(session_id):
            logger.debug(f"Using existing session ID: {session_id[:8]}...")
            return session_id
        else:
            logger.warning(
                f"Invalid session ID format from client: {session_id[:20]}... "
                "Generating new session ID"
            )

    # Generate new session ID
    new_session_id = str(uuid.uuid4())
    logger.info(f"Generated new session ID: {new_session_id[:8]}...")
    return new_session_id


# Default error messages (will be overridden in setup_chat_routes if config available)
ERROR_MESSAGES = {
    "queue_full": "Server busy, please try again later",
    "processing_error": "An error occurred while processing your request",
    "timeout": "Request timed out, please try again",
    "system_error": "System error occurred",
}


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    language: Optional[str] = None
    stream: bool = True
    deep_think: bool = False
    
    @validator('message')
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError('Message cannot be empty')
        
        v = v.strip()
        
        if len(v) < MIN_MESSAGE_LENGTH:
            raise ValueError(f'Message too short (min {MIN_MESSAGE_LENGTH} chars)')
        
        if len(v) > MAX_MESSAGE_LENGTH:
            raise ValueError(f'Message too long (max {MAX_MESSAGE_LENGTH} chars)')
        
        return v
    
    @validator('session_id')
    def validate_session_id(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) > 100:
                raise ValueError('Session ID too long')
        return v


class ChatResponse(BaseModel):
    response: str
    session_id: str
    is_emergency: bool = False
    language: str = "en"
    gpu_status: Optional[dict] = None
    cached: bool = False
    ai_source: str = "deepseek-ai/DeepSeek-V3.2-Exp"


async def stream_response(text: str) -> AsyncGenerator[str, None]:
    """Stream response word by word"""
    if not text:
        yield json.dumps({"type": "done"}) + "\n"
        return
    
    words = text.split()
    for i, word in enumerate(words):
        try:
            if i == 0:
                yield json.dumps({"type": "word", "content": word}) + "\n"
            else:
                yield json.dumps({"type": "word", "content": " " + word}) + "\n"
            await asyncio.sleep(0.03)
        except Exception as e:
            logger.error(f"Stream error: {e}")
            break
    
    yield json.dumps({"type": "done"}) + "\n"


def setup_chat_routes(
    app,
    ai_service,
    db_manager,
    language_service,
    cache_service,
    queue_service,
    config=None,
):
    global ERROR_MESSAGES
    if config:
        ERROR_MESSAGES = config.get_config_messages("error_messages")
    @router.options("/chat")
    async def chat_options():
        return {"message": "OK"}

    @router.post("/chat")
    async def chat_endpoint(request: ChatRequest, req: Request):
        # Validate and get session ID (with proper UUID validation)
        session_id = get_or_create_session_id(request.session_id)

        try:
            lang = ai_service.detect_language(request.message)
            logger.info(f"🔍 Language detected from message: {lang} for: '{request.message[:50]}...'")

            supported = ["th", "en", "jp", "id", "zh", "ko", "vi", "es", "fil", "hi"]
            if lang not in supported:
                logger.warning(f"Unsupported language {lang}, defaulting to 'th'")
                lang = "th"
        except Exception as e:
            logger.error(f"Language detection failed: {e}")
            lang = "th"

        logger.info(f"💬 Chat [{lang.upper()}] session={session_id[:8]}... msg_len={len(request.message)}")

        try:
            # Check for illegal content FIRST
            is_illegal, illegal_keyword = ai_service.contains_illegal_content(request.message)
            if is_illegal:
                logger.warning(f"⚖️ Illegal content detected in session {session_id[:8]}... keyword: {illegal_keyword}")

                # Check if this is a repeat offense
                is_repeat = False
                if db_manager.connection_available:
                    try:
                        # Check previous conversations for illegal content
                        history = db_manager.get_conversation_history(session_id, limit=50)
                        illegal_count = sum(1 for conv in history
                                          if conv.get('ai_response') and '⚖️' in conv.get('ai_response', ''))
                        is_repeat = illegal_count >= 1
                        logger.info(f"⚖️ Illegal content offense count: {illegal_count}, is_repeat: {is_repeat}")
                    except Exception as e:
                        logger.error(f"Failed to check offense history: {e}")

                illegal_response = ai_service.generate_illegal_content_warning(lang, is_repeat)

                # Save to database with special flag
                if db_manager.connection_available:
                    try:
                        db_manager.save_conversation(
                            session_id=session_id,
                            user_message=request.message,
                            ai_response=illegal_response,
                            is_emergency=False,
                            source="illegal_content_detection",
                            symptoms=None,
                            language=lang,
                        )
                    except Exception as e:
                        logger.error(f"Failed to save illegal content conversation: {e}")

                if request.stream:
                    return StreamingResponse(
                        stream_response(illegal_response),
                        media_type="application/x-ndjson",
                        headers={
                            "X-Session-ID": session_id,
                            "X-Language": lang,
                            "X-Emergency": "false",
                            "X-Cached": "false",
                            "X-AI-Source": "illegal_content_warning",
                            "X-Illegal-Content": "true",
                        },
                    )
                else:
                    return ChatResponse(
                        response=illegal_response,
                        session_id=session_id,
                        is_emergency=False,
                        language=lang,
                        ai_source="illegal_content_warning",
                    )

            # Check for emergency keywords
            if ai_service.contains_emergency_keywords(request.message):
                emergency_response = ai_service.generate_emergency_response(lang)

                if db_manager.connection_available:
                    try:
                        db_manager.save_conversation(
                            session_id=session_id,
                            user_message=request.message,
                            ai_response=emergency_response,
                            is_emergency=True,
                            source="emergency_detection",
                            symptoms=None,
                            language=lang,
                        )
                    except Exception as e:
                        logger.error(f"Failed to save emergency conversation: {e}")

                if request.stream:
                    return StreamingResponse(
                        stream_response(emergency_response),
                        media_type="application/x-ndjson",
                        headers={
                            "X-Session-ID": session_id,
                            "X-Language": lang,
                            "X-Emergency": "true",
                            "X-Cached": "false",
                            "X-AI-Source": "emergency",
                        },
                    )
                else:
                    return ChatResponse(
                        response=emergency_response,
                        session_id=session_id,
                        is_emergency=True,
                        language=lang,
                        ai_source="emergency",
                    )

            queue_stats = queue_service.get_stats()
            current_queue_size = queue_stats.get("queue_size", 0)

            task_id = await queue_service.add_task(
                prompt=request.message,
                session_id=session_id,
                lang=lang,
                queue_size=current_queue_size,
            )

            if not task_id:
                error_response = (
                    "เซิร์ฟเวอร์ไม่ว่าง กรุณาลองใหม่อีกครั้ง"
                    if lang == "th"
                    else "Server busy, please retry"
                )
                
                if request.stream:
                    return StreamingResponse(
                        stream_response(error_response),
                        media_type="application/x-ndjson",
                        headers={
                            "X-Session-ID": session_id,
                            "X-Language": lang,
                            "X-Emergency": "false",
                            "X-Cached": "false",
                            "X-AI-Source": "error",
                        },
                    )
                else:
                    return ChatResponse(
                        response=error_response,
                        session_id=session_id,
                        is_emergency=False,
                        language=lang,
                        ai_source="error",
                    )

            logger.info(f"Task queued: {task_id}, queue_size={current_queue_size}")

            try:
                result = await queue_service.get_result(task_id, timeout=120)
            except asyncio.CancelledError:
                # Handle cancellation
                error_text = "กรุณาลองใหม่อีกครั้งนะคะ" if lang == "th" else "Please try again"
                if request.stream:
                    return StreamingResponse(
                        stream_response(error_text),
                        media_type="application/x-ndjson",
                        headers={
                            "X-Session-ID": session_id,
                            "X-Language": lang,
                            "X-Emergency": "false",
                            "X-Cached": "false",
                            "X-AI-Source": "cancelled",
                        },
                    )
                return ChatResponse(
                    response=error_text,
                    session_id=session_id,
                    is_emergency=False,
                    language=lang,
                    ai_source="cancelled"
                )

            if result["status"] == "cancelled":
                error_text = "กรุณาลองใหม่อีกครั้งนะคะ" if lang == "th" else "Please try again"
                if request.stream:
                    return StreamingResponse(
                        stream_response(error_text),
                        media_type="application/x-ndjson",
                        headers={
                            "X-Session-ID": session_id,
                            "X-Language": lang,
                            "X-Emergency": "false",
                            "X-Cached": "false",
                            "X-AI-Source": "cancelled",
                        },
                    )
                return ChatResponse(
                    response=error_text,
                    session_id=session_id,
                    is_emergency=False,
                    language=lang,
                    ai_source="cancelled"
                )

            if result["status"] == "completed" and result["response"]:
                ai_response = result["response"]
                ai_source = result.get("ai_source", "unknown")

                if db_manager.connection_available:
                    try:
                        symptoms = ai_service.extract_symptoms(request.message, lang)

                        db_manager.save_conversation(
                            session_id=session_id,
                            user_message=request.message,
                            ai_response=ai_response,
                            is_emergency=False,
                            source=ai_source,
                            symptoms=symptoms,
                            language=lang,
                        )
                    except Exception as e:
                        logger.error(f"Failed to save conversation: {e}")

                if request.stream:
                    return StreamingResponse(
                        stream_response(ai_response),
                        media_type="application/x-ndjson",
                        headers={
                            "X-Session-ID": session_id,
                            "X-Language": lang,
                            "X-Emergency": "false",
                            "X-Cached": "false",
                            "X-AI-Source": ai_source,
                        },
                    )
                else:
                    return ChatResponse(
                        response=ai_response,
                        session_id=session_id,
                        is_emergency=False,
                        language=lang,
                        ai_source=ai_source,
                    )
            else:
                error_msg = result.get("error", "Unknown error")
                logger.error(f"Task failed: {error_msg}")

                final_response = (
                    "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
                    if lang == "th"
                    else "Error occurred, please retry"
                )

                if request.stream:
                    return StreamingResponse(
                        stream_response(final_response),
                        media_type="application/x-ndjson",
                        headers={
                            "X-Session-ID": session_id,
                            "X-Language": lang,
                            "X-Emergency": "false",
                            "X-Cached": "false",
                            "X-AI-Source": "error",
                        },
                    )
                else:
                    return ChatResponse(
                        response=final_response,
                        session_id=session_id,
                        is_emergency=False,
                        language=lang,
                        ai_source="error",
                    )

        except Exception as e:
            logger.error(f"Chat endpoint error: {e}", exc_info=True)
            error_text = "ขอโทษค่ะ เกิดข้อผิดพลาดขึ้น" if lang == "th" else "An error occurred"

            if request.stream:
                return StreamingResponse(
                    stream_response(error_text),
                    media_type="application/x-ndjson",
                    headers={
                        "X-Session-ID": session_id,
                        "X-Language": lang,
                        "X-Emergency": "false",
                        "X-Cached": "false",
                        "X-AI-Source": "error",
                    },
                )
            else:
                return ChatResponse(
                    response=error_text,
                    session_id=session_id,
                    is_emergency=False,
                    language=lang,
                    ai_source="error",
                )

    # New endpoint for file uploads
    @router.post("/chat/upload")
    async def chat_with_files(
        message: str = Form(...),
        session_id: Optional[str] = Form(None),
        stream: bool = Form(False),
        deep_think: bool = Form(False),
        files: List[UploadFile] = File(default=[]),
        req: Request = None
    ):
        """Chat endpoint with file upload support (images and PDFs)"""
        try:
            from services.file_processing_service import FileProcessingService

            # Validate message
            if not message or len(message.strip()) < MIN_MESSAGE_LENGTH:
                return ChatResponse(
                    response="กรุณาพิมพ์ข้อความนะคะ",
                    session_id=session_id or str(uuid.uuid4()),
                    is_emergency=False,
                    language="th",
                    ai_source="validation"
                )

            if len(message) > MAX_MESSAGE_LENGTH:
                return ChatResponse(
                    response=f"ข้อความยาวเกินไปค่ะ (สูงสุด {MAX_MESSAGE_LENGTH} ตัวอักษร)",
                    session_id=session_id or str(uuid.uuid4()),
                    is_emergency=False,
                    language="th",
                    ai_source="validation"
                )

            # Process session ID
            session_id = get_or_create_session_id(session_id)

            # Process uploaded files if any
            file_context = ""
            if files:
                # Validate file count (max 10 files)
                if len(files) > MAX_FILES_LIMIT:
                    error_messages = {
                        "th": f"ขอโทษค่ะ สามารถแนบไฟล์ได้สูงสุด {MAX_FILES_LIMIT} ไฟล์เท่านั้นนะคะ คุณแนบมา {len(files)} ไฟล์ค่ะ",
                        "en": f"Maximum {MAX_FILES_LIMIT} files allowed. You uploaded {len(files)} files",
                        "jp": f"最大{MAX_FILES_LIMIT}ファイルまでです。{len(files)}ファイルがアップロードされました"
                    }
                    lang = ai_service.detect_language(message)
                    return ChatResponse(
                        response=error_messages.get(lang, error_messages["th"]),
                        session_id=session_id,
                        is_emergency=False,
                        language=lang,
                        ai_source="validation"
                    )

                # Validate file sizes (max 10MB per file)
                MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
                oversized_files = []
                for uploaded_file in files:
                    # Read file size
                    content = await uploaded_file.read()
                    file_size = len(content)
                    
                    # Reset file pointer for later processing
                    await uploaded_file.seek(0)
                    
                    if file_size > MAX_FILE_SIZE:
                        oversized_files.append(uploaded_file.filename)
                
                if oversized_files:
                    error_messages = {
                        "th": f"ขอโทษค่ะ ไฟล์บางไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB ค่ะ): {', '.join(oversized_files[:3])}",
                        "en": f"Some files are too large (max 10MB): {', '.join(oversized_files[:3])}",
                        "jp": f"一部のファイルが大きすぎます（最大10MB）: {', '.join(oversized_files[:3])}"
                    }
                    lang = ai_service.detect_language(message)
                    return ChatResponse(
                        response=error_messages.get(lang, error_messages["th"]),
                        session_id=session_id,
                        is_emergency=False,
                        language=lang,
                        ai_source="validation"
                    )

                file_service = ai_service.file_processor  # Use initialized file processor with API token
                processed_files = []

                for uploaded_file in files:
                    try:
                        # Read file content
                        content = await uploaded_file.read()
                        content_type = uploaded_file.content_type or "application/octet-stream"
                        
                        # Validate file is not empty
                        if len(content) == 0:
                            logger.warning(f"Empty file uploaded: {uploaded_file.filename}")
                            continue

                        processed_files.append((uploaded_file.filename, content, content_type))
                    except Exception as e:
                        logger.error(f"Error reading file {uploaded_file.filename}: {e}")
                        continue

                # Process all files
                processing_result = await file_service.process_files(processed_files)

                # Create context from extracted text
                if processing_result.get('extracted_text'):
                    file_context = "\n\n📎 ข้อมูลจากไฟล์แนบ:\n"
                    for item in processing_result['extracted_text']:
                        if item['text']:
                            file_context += f"\n[{item['source']}]:\n{item['text']}\n"

                # Log errors if any
                if processing_result.get('errors'):
                    logger.warning(f"File processing errors: {processing_result['errors']}")

            # Combine message with file context
            full_message = message + file_context

            # Detect language
            detected_lang = language_service.detect_language(message)
            lang = detected_lang if detected_lang else "th"

            lang = ai_service.detect_language(message)
            logger.info(f"File upload chat detected language: {lang}")

            if ai_service.contains_emergency_keywords(full_message):
                emergency_response = ai_service.generate_emergency_response(lang)
                return ChatResponse(
                    response=emergency_response,
                    session_id=session_id,
                    is_emergency=True,
                    language=lang,
                    ai_source="emergency"
                )

            queue_stats = queue_service.get_stats()
            current_queue_size = queue_stats.get("queue_size", 0)

            task_id = await queue_service.add_task(
                prompt=full_message,
                session_id=session_id,
                lang=lang,
                queue_size=current_queue_size,
            )

            if not task_id:
                error_response = (
                    "ขอโทษค่ะ เซิร์ฟเวอร์ไม่ว่างตอนนี้ กรุณาลองใหม่อีกครั้งนะคะ"
                    if lang == "th"
                    else "Server busy, please retry"
                )
                return ChatResponse(
                    response=error_response,
                    session_id=session_id,
                    is_emergency=False,
                    language=lang,
                    ai_source="error",
                )

            result = await queue_service.get_result(task_id, timeout=120)

            if result["status"] == "completed" and result["response"]:
                ai_response = result["response"]
                ai_source = result.get("ai_source", "unknown")

                if db_manager.connection_available:
                    try:
                        symptoms = ai_service.extract_symptoms(message, lang)
                        db_manager.save_conversation(
                            session_id=session_id,
                            user_message=message,
                            ai_response=ai_response,
                            is_emergency=False,
                            source=ai_source,
                            symptoms=symptoms,
                            language=lang,
                        )
                    except Exception as e:
                        logger.error(f"Failed to save conversation: {e}")

                return ChatResponse(
                    response=ai_response,
                    session_id=session_id,
                    is_emergency=False,
                    language=lang,
                    ai_source=ai_source,
                )
            else:
                error_msg = result.get("error", "Unknown error")
                logger.error(f"Task failed: {error_msg}")
                final_response = (
                    "ขอโทษค่ะ เกิดข้อผิดพลาดขึ้น กรุณาลองใหม่อีกครั้งนะคะ"
                    if lang == "th"
                    else "Error occurred, please retry"
                )
                return ChatResponse(
                    response=final_response,
                    session_id=session_id,
                    is_emergency=False,
                    language=lang,
                    ai_source="error",
                )

        except Exception as e:
            logger.error(f"File upload chat error: {e}", exc_info=True)
            return ChatResponse(
                response="ขอโทษค่ะ เกิดข้อผิดพลาดในการประมวลผลไฟล์ กรุณาลองใหม่อีกครั้งนะคะ",
                session_id=session_id or str(uuid.uuid4()),
                is_emergency=False,
                language="th",
                ai_source="error"
            )

    app.include_router(router)