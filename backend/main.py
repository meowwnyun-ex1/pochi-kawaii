import logging
import os
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
from routes.feedback import setup_feedback_routes
from routes.health import setup_health_routes
from routes.announcements import setup_announcement_routes
from routes.generate import setup_generate_routes
from services.auth_service import AuthService
from services.feedback_service import FeedbackService
from services.image_service import ImageService

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
            log_file=str(config.logs_dir / "app.log") if hasattr(config, 'logs_dir') and config.logs_dir else None
        )
        logging_msg = startup_msgs.get("structured_logging_initialized", "Structured logging initialized")
        logger.info(f"✅ {logging_msg}")
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
feedback_service = FeedbackService(db_manager)

image_service = ImageService(
    api_token=config.huggingface_api_token,
    model_name=config.huggingface_model,
    timeout=config.huggingface_timeout,
    api_config=config.api_config
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    starting_msg = startup_msgs.get("starting")
    if not starting_msg:
        starting_msg = ""
    logger.info(starting_msg)
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
            rate_msg = startup_msgs.get("rate_limiter_initialized", "Rate limiter initialized: {min}/min, {hour}/hour")
            logger.info(f"✅ {rate_msg.format(min=config.rate_limit_per_minute, hour=config.rate_limit_per_hour)}")
        except Exception as e:
            failed_msg = startup_msgs.get("rate_limiter_failed", "Failed to initialize rate limiter")
            logger.error(f"❌ {failed_msg}: {e}")
            RATE_LIMITER_INITIALIZED = False

        try:
            init_hf_circuit_breaker(
                failure_threshold=5,
                recovery_timeout=60.0
            )
            cb_msg = startup_msgs.get("circuit_breaker_initialized", "HuggingFace API circuit breaker initialized")
            logger.info(f"✅ {cb_msg}")
        except Exception as e:
            failed_msg = startup_msgs.get("circuit_breaker_failed", "Failed to initialize circuit breaker")
            logger.error(f"❌ {failed_msg}: {e}")

    try:
        db_initialized = db_manager.initialize_tables()
        if db_initialized:
            logger.info("✅ " + startup_msgs.get("db_init_success", "Database initialized"))
        else:
            logger.warning("⚠️  " + startup_msgs.get("db_init_failed", "Database unavailable"))
    except Exception as e:
        logger.error(f"❌ Database error: {e}", exc_info=True)

    hf_model_msg = startup_msgs.get("huggingface_model_info", "HuggingFace AI: {model} - Image Generation")
    logger.info(f"🎨 {hf_model_msg.format(model=config.huggingface_model)}")

    logger.info("=" * 60)
    app_name = config.api_config.get("app_info", {}).get("name", "")
    server_protocol = os.getenv("SERVER_PROTOCOL", "http")
    ready_msg = startup_msgs.get("server_ready", "Application ready on {protocol}://{host}:{port}")
    if app_name:
        logger.info(f"✅ {app_name} - {ready_msg.format(protocol=server_protocol, host=config.server_host, port=config.server_port)}")
    else:
        logger.info(f"✅ {ready_msg.format(protocol=server_protocol, host=config.server_host, port=config.server_port)}")
    logger.info("=" * 60)

    yield

    logger.info("=" * 60)
    logger.info("🛑 " + startup_msgs.get("application_shutting_down", "Shutting down gracefully..."))
    logger.info("=" * 60)


    try:
        closing_msg = startup_msgs.get("closing_db", "Closing database connections...")
        logger.info(closing_msg)
        db_manager.close()
        closed_msg = startup_msgs.get("db_closed", "Database connections closed")
        logger.info(f"✅ {closed_msg}")
    except Exception as e:
        logger.error(f"❌ Error closing database: {e}")

    logger.info("=" * 60)
    shutdown_msg = startup_msgs.get("shutdown_complete", "Shutdown complete")
    logger.info(f"✅ {shutdown_msg}")
    logger.info("=" * 60)


try:
    from backend import __version__ as app_version, __description__ as app_description
except (ImportError, ModuleNotFoundError, AttributeError):
    app_version = os.getenv("APP_VERSION", "v1")
    app_description = os.getenv("APP_DESCRIPTION", "")


class backend_info:
    __description__ = app_description
    __version__ = app_version


app = FastAPI(
    title=backend_info.__description__ or "Pochi-Kawaii API",
    version=backend_info.__version__,
    lifespan=lifespan
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    logger.warning(f"Validation error: {errors}")

    error_msgs = config.api_config.get("error_messages", {})
    detail_msg = error_msgs.get("validation_error", "Validation error")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": detail_msg,
            "errors": errors
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected error: {exc}", exc_info=True)

    error_msgs = config.api_config.get("error_messages", {})
    detail_msg = error_msgs.get("internal_server_error", "Internal server error")
    message = error_msgs.get("unexpected_error", "An unexpected error occurred")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": detail_msg,
            "message": message
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
        enabled_msg = startup_msgs.get("rate_limiting_enabled", "Rate limiting middleware enabled")
        logger.info(f"✅ {enabled_msg}")
    except Exception as e:
        logger.warning(f"Failed to add rate limiting middleware: {e}")
elif PRODUCTION_FEATURES_AVAILABLE:
    warning_msg = startup_msgs.get("rate_limiter_not_initialized", "Rate limiter not initialized, middleware not enabled")
    logger.warning(f"⚠️  {warning_msg}")


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

    csp_connect_src = os.getenv("CSP_CONNECT_SRC", "https://router.huggingface.co https://api-inference.huggingface.co")
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https: blob:; "
        "font-src 'self' data:; "
        f"connect-src 'self' {csp_connect_src}; "
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


setup_health_routes(app, config, db_manager, image_service)
setup_feedback_routes(app, feedback_service)
setup_admin_routes(app, auth_service, feedback_service)
setup_announcement_routes(app, db_manager, auth_service)
setup_generate_routes(app, image_service, config)

if __name__ == "__main__":
    import uvicorn

    def handle_shutdown_signal(signum, frame):
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_shutdown_signal)
    signal.signal(signal.SIGINT, handle_shutdown_signal)

    starting_server_msg = startup_msgs.get("starting_server", "Starting server on {host}:{port}")
    logger.info(starting_server_msg.format(host=config.server_host, port=config.server_port))

    try:
        uvicorn.run(
            app,
            host=config.server_host,
            port=config.server_port,
            log_level=config.log_level.lower(),
        )
    except KeyboardInterrupt:
        shutdown_msg = startup_msgs.get("application_shutting_down", "Shutting down gracefully...")
        logger.info(f"Received KeyboardInterrupt, {shutdown_msg}")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        sys.exit(1)