"""
Structured Logging Utility with Request ID Tracking
Enables better debugging and log aggregation in production
"""

import logging
import json
import sys
from datetime import datetime
from typing import Optional, Dict, Any
from contextvars import ContextVar
import uuid

# Context variable for request ID (thread-safe)
request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)


class StructuredFormatter(logging.Formatter):
    """JSON formatter for structured logging"""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        # Base log data
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add request ID if available
        request_id = request_id_var.get()
        if request_id:
            log_data["request_id"] = request_id

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields
        if hasattr(record, "extra_data"):
            log_data.update(record.extra_data)

        # Add file location for errors and above
        if record.levelno >= logging.ERROR:
            log_data["file"] = f"{record.filename}:{record.lineno}"
            log_data["function"] = record.funcName

        return json.dumps(log_data, default=str)


class RequestIDFilter(logging.Filter):
    """Filter to add request ID to log records"""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get() or "no-request-id"
        return True


def setup_logging(
    log_level: str = "INFO", json_format: bool = False, log_file: Optional[str] = None
):
    """
    Setup application logging

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_format: Use JSON structured logging
        log_file: Optional file path for file logging
    """
    level = getattr(logging, log_level.upper(), logging.INFO)

    # Fix Windows console encoding for emoji/unicode support
    try:
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        if hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception as e:
        print(f"Failed to setup logging: {e}")  # Ignore if reconfigure not available

    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing handlers
    root_logger.handlers.clear()

    if json_format:
        # JSON structured logging
        formatter = StructuredFormatter()
    else:
        # Human-readable logging
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(RequestIDFilter())
    root_logger.addHandler(console_handler)

    # File handler (optional)
    if log_file:
        try:
            from pathlib import Path
            log_path = Path(log_file) if not isinstance(log_file, Path) else log_file
            log_path.parent.mkdir(parents=True, exist_ok=True)

            file_handler = logging.FileHandler(str(log_path), mode='a', encoding='utf-8')
            file_handler.setFormatter(formatter)
            file_handler.addFilter(RequestIDFilter())
            root_logger.addHandler(file_handler)
            logging.info(f"Logging to file: {log_path}")
        except (PermissionError, OSError) as e:
            logging.warning(f"Cannot write to log file {log_file}: {e}. Using console only.")
        except Exception as e:
            logging.warning(f"Failed to setup file logging: {e}")

    logging.info(f"Logging configured: level={log_level}, json={json_format}")


def set_request_id(request_id: Optional[str] = None) -> str:
    """
    Set request ID for current context

    Args:
        request_id: Request ID (generated if not provided)

    Returns:
        The request ID
    """
    if request_id is None:
        request_id = str(uuid.uuid4())

    request_id_var.set(request_id)
    return request_id


def get_request_id() -> Optional[str]:
    """Get current request ID"""
    return request_id_var.get()


def clear_request_id():
    """Clear request ID from context"""
    request_id_var.set(None)


def log_with_extra(logger: logging.Logger, level: int, message: str, **extra):
    """
    Log with extra structured data

    Args:
        logger: Logger instance
        level: Log level
        message: Log message
        **extra: Additional structured data
    """
    extra_data = {"extra_data": extra}
    logger.log(level, message, extra=extra_data)


# Context manager for request tracking
class RequestContext:
    """Context manager for request ID tracking"""

    def __init__(self, request_id: Optional[str] = None):
        self.request_id = request_id or str(uuid.uuid4())
        self.previous_id = None

    def __enter__(self):
        self.previous_id = get_request_id()
        set_request_id(self.request_id)
        return self.request_id

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.previous_id:
            set_request_id(self.previous_id)
        else:
            clear_request_id()
