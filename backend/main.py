import logging
import sys
import signal
import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    encoding='utf-8',
    errors='replace'
)
logger = logging.getLogger(__name__)

sys.path.insert(0, str(Path(__file__).parent))

from config import Config
from database import DatabaseManager
from routes.admin import setup_admin_routes
from routes.chat import setup_chat_routes
from routes.feedback import setup_feedback_routes
from routes.health import setup_health_routes
from routes.announcements import setup_announcement_routes
from routes.generate import setup_generate_routes
from services.ai_service import AIService
from services.auth_service import AuthService
from services.cache_service import CacheService
from services.feedback_service import FeedbackService
from services.language_service import LanguageService
from services.queue_service import AIQueueService
from services.chibi_image_service import ChibiImageService
try:
    from services.medical_knowledge_service import MedicalKnowledgeService
    from services.health_analytics_service import HealthAnalyticsService
    MEDICAL_SERVICES_AVAILABLE = True
except ImportError:
    MEDICAL_SERVICES_AVAILABLE = False
    logger.warning("Medical services not available (optional)")

try:
    from middleware.rate_limiter import init_rate_limiter, rate_limit_middleware
    from services.circuit_breaker import init_hf_circuit_breaker
    from utils.logger import setup_logging, set_request_id, get_request_id
    PRODUCTION_FEATURES_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Production features not available: {e}")
    PRODUCTION_FEATURES_AVAILABLE = False

RATE_LIMITER_INITIALIZED = False

try:
    config = Config()
    logging.getLogger().setLevel(getattr(logging, config.log_level.upper()))
except (FileNotFoundError, ValueError) as e:
    logger.error("=" * 80)
    logger.error("❌ CRITICAL: Failed to initialize configuration")
    logger.error(f"Error: {e}")
    logger.error("=" * 80)
    logger.error("Please ensure:")
    logger.error("  1. .env file exists in project root")
    logger.error("  2. All required environment variables are set")
    logger.error("  3. Values are in correct format")
    logger.error("=" * 80)
    sys.exit(1)

if PRODUCTION_FEATURES_AVAILABLE:
    try:
        json_logging = config.environment == "production"
        setup_logging(
            log_level=config.log_level,
            json_format=json_logging,
            log_file=config.logs_dir / "app.log" if hasattr(config, 'logs_dir') else None
        )
        logger.info("✅ Structured logging initialized")
    except Exception as e:
        logger.warning(f"Failed to setup structured logging: {e}")

startup_msgs = config.api_config.get("startup_messages", {})

db_manager = DatabaseManager(
    config.database_url,
    config.database_timeout,
    config.database_pool_size,
    config.database_max_overflow
)
auth_service = AuthService(
    config.admin_password,
    config.jwt_secret,
    config.jwt_token_expiry_hours
)
ai_service = AIService(
    config.huggingface_api_token,
    config.huggingface_base_url,
    config.huggingface_model,
    config.huggingface_timeout,
    db_manager,
    config.enable_learning,
    config.learning_min_confidence,
    config.similar_question_threshold,
)
feedback_service = FeedbackService(db_manager)
language_service = LanguageService()
queue_service = AIQueueService()
cache_service = CacheService()

# Chibi Image Generation Service
chibi_service = ChibiImageService(
    api_token=config.huggingface_api_token,
    model_name=config.huggingface_model,
    base_url=config.huggingface_base_url,
    timeout=config.huggingface_timeout
)

# Optional medical services
if MEDICAL_SERVICES_AVAILABLE:
    health_analytics_service = HealthAnalyticsService(db_manager)
else:
    health_analytics_service = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info(startup_msgs.get("starting", "🚀 Starting Pochi! Kawaii ne~ - Chibi AI Generator"))
    logger.info("=" * 60)

    if PRODUCTION_FEATURES_AVAILABLE:
        # Bug #21 fix - Track rate limiter initialization separately
        try:
            init_rate_limiter(
                requests_per_minute=config.rate_limit_per_minute,
                requests_per_hour=config.rate_limit_per_hour
            )
            global RATE_LIMITER_INITIALIZED
            RATE_LIMITER_INITIALIZED = True
            logger.info(f"✅ Rate limiter initialized: {config.rate_limit_per_minute}/min, {config.rate_limit_per_hour}/hour")
        except Exception as e:
            logger.error(f"❌ Failed to initialize rate limiter: {e}")
            RATE_LIMITER_INITIALIZED = False

        try:
            init_hf_circuit_breaker(
                failure_threshold=5,
                recovery_timeout=60.0
            )
            logger.info("✅ HuggingFace API circuit breaker initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize circuit breaker: {e}")

    try:
        db_initialized = db_manager.initialize_tables()
        if db_initialized:
            logger.info("✅ " + startup_msgs.get("db_init_success", "Database initialized"))

            if MEDICAL_SERVICES_AVAILABLE:
                try:
                    medical_service = MedicalKnowledgeService(db_manager)
                    medical_initialized = medical_service.initialize_medical_tables()
                    if medical_initialized:
                        logger.info("✅ Medical Knowledge tables initialized (optional)")
                    else:
                        logger.warning("⚠️  Medical tables initialization failed (optional)")
                except Exception as e:
                    logger.warning(f"⚠️  Medical services not initialized: {e}")
        else:
            logger.warning("⚠️  " + startup_msgs.get("db_init_failed", "Database unavailable"))
    except Exception as e:
        logger.error(f"❌ Database error: {e}", exc_info=True)

    logger.info(f"🎨 HuggingFace AI: {config.huggingface_model} - Chibi Image Generation")
    logger.info(f"✨ Fixed Chibi Prompt: Consistent kawaii style for all users")

    if config.enable_learning:
        logger.info(f"🧠 Learning: ENABLED (confidence≥{config.learning_min_confidence}, similarity≥{config.similar_question_threshold})")
    else:
        logger.info("📖 Learning: DISABLED")

    try:
        await queue_service.start_workers(ai_service)
        logger.info("✅ " + startup_msgs.get("queue_service_started", "Queue service started"))
    except Exception as e:
        logger.error(f"❌ Failed to start queue service: {e}", exc_info=True)

    logger.info("=" * 60)
    logger.info(f"✅ Pochi! Kawaii ne~ ready on http://{config.server_host}:{config.server_port}")
    logger.info("=" * 60)

    yield

    logger.info("=" * 60)
    logger.info("🛑 " + startup_msgs.get("application_shutting_down", "Shutting down gracefully..."))
    logger.info("=" * 60)

    try:
        logger.info("Stopping queue service...")
        await asyncio.wait_for(queue_service.shutdown(), timeout=10.0)
        logger.info("✅ Queue service stopped")
    except asyncio.TimeoutError:
        logger.warning("⚠️  Queue service shutdown timed out")
    except Exception as e:
        logger.error(f"❌ Error shutting down queue service: {e}")

    try:
        logger.info("Closing database connections...")
        db_manager.close()
        logger.info("✅ Database connections closed")
    except Exception as e:
        logger.error(f"❌ Error closing database: {e}")

    logger.info("=" * 60)
    logger.info("✅ Shutdown complete")
    logger.info("=" * 60)


try:
    from backend import __version__ as app_version, __description__ as app_description
except (ImportError, ModuleNotFoundError, AttributeError):
    app_version = "beta"
    app_description = "Medical AI consultation backend"


class backend_info:
    __description__ = app_description
    __version__ = app_version


app = FastAPI(
    title=backend_info.__description__, 
    version=backend_info.__version__, 
    lifespan=lifespan
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    logger.warning(f"Validation error: {errors}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": errors
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected error: {exc}", exc_info=True)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "message": "An unexpected error occurred"
        }
    )

origins_list = config.cors_origins
logger.info(f"{startup_msgs.get('cors_origins', 'CORS')}: {origins_list}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Bug #21 fix - Only add middleware if rate limiter was actually initialized
if RATE_LIMITER_INITIALIZED:
    try:
        app.middleware("http")(rate_limit_middleware)
        logger.info("✅ Rate limiting middleware enabled")
    except Exception as e:
        logger.warning(f"Failed to add rate limiting middleware: {e}")
elif PRODUCTION_FEATURES_AVAILABLE:
    logger.warning("⚠️  Rate limiter not initialized, middleware not enabled")


@app.middleware("http")
async def request_middleware(request: Request, call_next):
    if PRODUCTION_FEATURES_AVAILABLE:
        request_id = request.headers.get("X-Request-ID")
        try:
            set_request_id(request_id)
        except Exception as e:
            logger.debug(f"Failed to set request ID: {e}")

    response = await call_next(request)

    # ════════════════════════════════════════════════════════════════════════════
    # 🔒 SECURITY HEADERS
    # ════════════════════════════════════════════════════════════════════════════

    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "SAMEORIGIN"

    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"

    # XSS protection for legacy browsers
    response.headers["X-XSS-Protection"] = "1; mode=block"

    # Control referrer information
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Restrict browser features
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=(), payment=(), usb=()"

    # Content Security Policy - Allow Huggingface API for AI requests
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self' data:; "
        "connect-src 'self' https://api-inference.huggingface.co; "
        "frame-ancestors 'self'; "
        "base-uri 'self'; "
        "form-action 'self';"
    )

    # Remove server identification headers
    if "Server" in response.headers:
        del response.headers["Server"]
    if "X-Powered-By" in response.headers:
        del response.headers["X-Powered-By"]

    if PRODUCTION_FEATURES_AVAILABLE:
        try:
            req_id = get_request_id()
            if req_id:
                response.headers["X-Request-ID"] = req_id
        except Exception as e:
            logger.debug(f"Failed to add request ID to response: {e}")

    if "*" not in origins_list:
        origin = request.headers.get("origin", "")
        if origin in origins_list:
            response.headers["Access-Control-Allow-Origin"] = origin

    return response


setup_health_routes(app, config, db_manager, ai_service, queue_service, cache_service)
setup_chat_routes(
    app, ai_service, db_manager, language_service, cache_service, queue_service, config
)
setup_feedback_routes(app, feedback_service)
setup_admin_routes(app, auth_service, feedback_service, cache_service, ai_service)
setup_announcement_routes(app, db_manager, auth_service)
setup_generate_routes(app, chibi_service)

if __name__ == "__main__":
    import uvicorn

    def handle_shutdown_signal(signum, frame):
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_shutdown_signal)
    signal.signal(signal.SIGINT, handle_shutdown_signal)

    logger.info(f"Starting server on {config.server_host}:{config.server_port}")

    try:
        uvicorn.run(
            app,
            host=config.server_host,
            port=config.server_port,
            log_level=config.log_level.lower(),
        )
    except KeyboardInterrupt:
        logger.info("Received KeyboardInterrupt, shutting down...")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        sys.exit(1)