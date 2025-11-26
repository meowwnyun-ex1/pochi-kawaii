import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


def load_env_file(env_path: Path) -> None:
    """
    Load .env file manually with proper handling of special characters
    This fixes issues with python-dotenv not parsing complex DATABASE_URL correctly
    """
    if not env_path.exists():
        return

    try:
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()

                if not line or line.startswith('#'):
                    continue

                match = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)=(.*)$', line)
                if match:
                    key, value = match.groups()
                    key = key.strip()
                    value = value.strip()

                    if value.startswith('"') and value.endswith('"'):
                        value = value[1:-1]
                    elif value.startswith("'") and value.endswith("'"):
                        value = value[1:-1]

                    os.environ[key] = value

        logger.info(f"Loaded environment from {env_path}")
    except Exception as e:
        logger.error(f"Failed to load .env file: {e}")
        raise


class Config:
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.project_root = self.base_dir.parent

        env_file = self.project_root / ".env"
        if env_file.exists():
            load_env_file(env_file)
        else:
            environment = os.getenv("ENVIRONMENT", "development").lower()
            if environment == "production":
                error_msg = (
                    f"❌ CRITICAL: .env file not found at {env_file}\n"
                    f"Production environment requires .env file for configuration.\n"
                    f"Please create .env file with required variables."
                )
                logger.error(error_msg)
                raise FileNotFoundError(error_msg)
            else:
                logger.warning(f".env file not found at {env_file}")
                logger.warning("Using environment variables or defaults - this may cause issues!")

        self._validate_required_env_vars()
        self._security_checks()

        self.config_dir = self._validate_dir(os.getenv("CONFIG_DIR", ""))
        self.backend_dir = self._validate_dir(os.getenv("BACKEND_DIR", ""))
        self.frontend_dir = self._validate_dir(os.getenv("FRONTEND_DIR", ""))
        self.logs_dir = self._validate_dir(os.getenv("LOGS_DIR", ""))
        self.cache_dir = self._validate_dir(os.getenv("CACHE_DIR", ".cache"))
        self.temp_dir = self._validate_dir(os.getenv("TEMP_DIR", ".cache/temp"))

        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

        self._api_config = self._load_api_config()

        self.enable_learning = True
        self.learning_min_confidence = 0.85
        self.similar_question_threshold = 0.90

    def _validate_required_env_vars(self) -> None:
        required_vars = [
            "DATABASE_URL",
            "ADMIN_PASSWORD",
            "JWT_SECRET",
            "HUGGINGFACE_API_TOKEN",
            "SERVER_HOST",
            "SERVER_PORT",
        ]

        missing_vars = []
        for var in required_vars:
            value = os.getenv(var)
            if not value or value.strip() == "":
                missing_vars.append(var)

        if missing_vars:
            error_msg = f"❌ Missing required environment variables: {', '.join(missing_vars)}"
            logger.error(error_msg)
            logger.error("Please check your .env file and ensure all required variables are set")
            logger.error("Run: python scripts/generate_secrets.py to generate secure secrets")
            raise ValueError(error_msg)

        logger.info("✅ All required environment variables are set")

    def _security_checks(self) -> None:
        warnings: List[str] = []

        jwt_secret = os.getenv("JWT_SECRET", "")
        insecure_jwt_patterns = [
            "CHANGE_THIS",
            "STRONG_JWT_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION",
            "secret",
            "password",
        ]

        if len(jwt_secret) < 32:
            warnings.append("⚠️  JWT_SECRET is too short (minimum 32 characters recommended)")

        if any(pattern.lower() in jwt_secret.lower() for pattern in insecure_jwt_patterns):
            warnings.append("⚠️  JWT_SECRET appears to be using a default/insecure value")

        admin_password = os.getenv("ADMIN_PASSWORD", "")
        if admin_password in ["admin", "password", "change_this_password", "sdx@admin123"]:
            warnings.append("⚠️  ADMIN_PASSWORD appears to be using a default/insecure value")

        if len(admin_password) < 12:
            warnings.append("⚠️  ADMIN_PASSWORD is too short (minimum 12 characters recommended)")

        hf_token = os.getenv("HUGGINGFACE_API_TOKEN", "")
        if not hf_token:
            warnings.append("⚠️  HUGGINGFACE_API_TOKEN is missing or not set")
        elif not hf_token.startswith("hf_"):
            warnings.append("⚠️  HUGGINGFACE_API_TOKEN has invalid format (should start with 'hf_')")
        elif "YOUR_HF" in hf_token or "YOUR_HUGGING" in hf_token:
            warnings.append("⚠️  HUGGINGFACE_API_TOKEN contains placeholder value")

        cors_allow_all = os.getenv("CORS_ALLOW_ALL", "false").lower()
        environment = os.getenv("ENVIRONMENT", "production")
        if cors_allow_all == "true" and environment == "production":
            warnings.append("⚠️  CORS_ALLOW_ALL=true in production is a security risk!")

        # Validate DATABASE_URL format - แก้ไขการตรวจสอบ
        database_url = os.getenv("DATABASE_URL", "")
        if not database_url:
            warnings.append("⚠️  DATABASE_URL is missing")
        elif len(database_url) < 50:
            warnings.append(f"⚠️  DATABASE_URL seems too short ({len(database_url)} chars) - check .env file encoding")
        elif "DRIVER=" not in database_url.upper():
            warnings.append(f"⚠️  DATABASE_URL missing DRIVER parameter")
        elif "YOUR_" in database_url or "your_" in database_url:
            warnings.append("⚠️  DATABASE_URL contains placeholder values")

        # Validate server port is a valid number
        try:
            port = int(os.getenv("SERVER_PORT", "4003"))
            if port < 1 or port > 65535:
                warnings.append(f"⚠️  SERVER_PORT ({port}) is outside valid range (1-65535)")
        except ValueError:
            warnings.append("⚠️  SERVER_PORT is not a valid number")

        # Validate rate limiting values
        try:
            rate_per_min = int(os.getenv("RATE_LIMIT_PER_MINUTE", "30"))
            if rate_per_min < 1 or rate_per_min > 1000:
                warnings.append(f"⚠️  RATE_LIMIT_PER_MINUTE ({rate_per_min}) seems unusual")
        except ValueError:
            warnings.append("⚠️  RATE_LIMIT_PER_MINUTE is not a valid number")

        try:
            rate_per_hour = int(os.getenv("RATE_LIMIT_PER_HOUR", "500"))
            if rate_per_hour < 1 or rate_per_hour > 100000:
                warnings.append(f"⚠️  RATE_LIMIT_PER_HOUR ({rate_per_hour}) seems unusual")
        except ValueError:
            warnings.append("⚠️  RATE_LIMIT_PER_HOUR is not a valid number")

        # Check for suspicious patterns in CORS_ORIGINS
        cors_origins = os.getenv("CORS_ORIGINS", "")
        if "*" in cors_origins and environment == "production":
            warnings.append("⚠️  CORS_ORIGINS contains wildcard (*) in production - security risk!")

        if warnings:
            logger.warning("=" * 80)
            logger.warning("🔒 SECURITY WARNINGS DETECTED:")
            logger.warning("=" * 80)
            for warning in warnings:
                logger.warning(warning)
            logger.warning("=" * 80)
            logger.warning("Run: python scripts/generate_secrets.py to generate secure secrets")
            logger.warning("=" * 80)

            if environment == "production":
                critical_warnings = [w for w in warnings if "JWT_SECRET" in w or "ADMIN_PASSWORD" in w]
                if critical_warnings:
                    logger.error("=" * 80)
                    logger.error("❌ CRITICAL: Insecure secrets detected in production!")
                    logger.error("⚠️  System will start but you MUST fix these issues ASAP!")
                    logger.error("⚠️  Generate secure secrets: python scripts/generate_secrets.py")
                    logger.error("=" * 80)
        else:
            logger.info("✅ Security checks passed")

    @property
    def environment(self) -> str:
        return os.getenv("ENVIRONMENT", "production")

    @property
    def database_url(self) -> str:
        """
        Get DATABASE_URL from environment with validation
        Note: ConnectionPool will auto-fix special characters (@ - in UID, DATABASE, PWD)
        """
        url = os.getenv("DATABASE_URL", "")
        
        # Debug logging เพื่อช่วย troubleshoot
        if not url:
            logger.error("DATABASE_URL is empty!")
            raise ValueError("DATABASE_URL is not set in environment")
        
        if len(url) < 50:
            logger.error(f"DATABASE_URL seems too short: {len(url)} chars")
            logger.error(f"Content: '{url}'")
            logger.error("This usually means .env file has encoding issues or line breaks")
            logger.error("Try recreating .env file with proper UTF-8 encoding")
            raise ValueError(f"DATABASE_URL is too short ({len(url)} chars)")
        
        # Remove quotes ถ้ามี (บาง env parser เก็บ quotes ไว้)
        url = url.strip().strip('"').strip("'")
        
        logger.debug(f"DATABASE_URL loaded successfully ({len(url)} chars)")
        return url

    @property
    def database_pool_size(self) -> int:
        try:
            size = int(os.getenv("DATABASE_POOL_SIZE", "10"))
            if size <= 0 or size > 100:
                logger.warning(f"Invalid pool size {size}, using default 10")
                return 10
            return size
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid DATABASE_POOL_SIZE: {e}, using default 10")
            return 10

    @property
    def database_max_overflow(self) -> int:
        try:
            overflow = int(os.getenv("DATABASE_MAX_OVERFLOW", "20"))
            if overflow < 0 or overflow > 200:
                logger.warning(f"Invalid max overflow {overflow}, using default 20")
                return 20
            return overflow
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid DATABASE_MAX_OVERFLOW: {e}, using default 20")
            return 20

    @property
    def huggingface_api_token(self) -> str:
        return os.getenv("HUGGINGFACE_API_TOKEN", "")

    @property
    def huggingface_base_url(self) -> str:
        url = os.getenv("HUGGINGFACE_BASE_URL", "https://router.huggingface.co/hf-inference/models")
        return url

    @property
    def huggingface_model(self) -> str:
        model = os.getenv("HUGGINGFACE_MODEL", "emilyalsentzer/Bio_ClinicalBERT")
        return model

    @property
    def huggingface_timeout(self) -> int:
        try:
            timeout = int(os.getenv("HUGGINGFACE_TIMEOUT", "60"))
            if timeout <= 0 or timeout > 300:
                logger.warning(f"Invalid timeout {timeout}, using default 60")
                return 60
            return timeout
        except (ValueError, TypeError):
            logger.error("Invalid HUGGINGFACE_TIMEOUT, using default 60")
            return 60
    
    @property
    def admin_password(self) -> str:
        return os.getenv("ADMIN_PASSWORD", "")

    @property
    def jwt_secret(self) -> str:
        return os.getenv("JWT_SECRET", "")

    @property
    def server_host(self) -> str:
        return os.getenv("SERVER_HOST", "127.0.0.1")

    @property
    def server_port(self) -> int:
        try:
            port = int(os.getenv("SERVER_PORT", "4003"))
            if port <= 0 or port > 65535:
                return 4003
            return port
        except (ValueError, TypeError):
            return 4003

    @property
    def log_level(self) -> str:
        level = os.getenv("LOG_LEVEL", "info").upper()
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        return level if level in valid_levels else "INFO"

    @property
    def cors_origins(self) -> List[str]:
        allow_all = os.getenv("CORS_ALLOW_ALL", "false").lower() == "true"

        if allow_all:
            return ["*"]

        origins = []
        
        cors_origins_env = os.getenv("CORS_ORIGINS", "")
        if cors_origins_env:
            origins.extend([o.strip() for o in cors_origins_env.split(",") if o.strip()])

        additional = os.getenv("CORS_ADDITIONAL_ORIGINS", "")
        if additional:
            origins.extend([o.strip() for o in additional.split(",") if o.strip()])

        return list(set(origins)) if origins else ["http://localhost"]

    @property
    def enable_debug(self) -> bool:
        debug_str = os.getenv("ENABLE_DEBUG", "false")
        return debug_str.lower() in ["true", "1", "yes"]

    @property
    def database_timeout(self) -> int:
        try:
            timeout = int(os.getenv("DATABASE_TIMEOUT", "30"))
            if timeout <= 0 or timeout > 300:
                return 30
            return timeout
        except (ValueError, TypeError):
            return 30

    @property
    def admin_path(self) -> str:
        return os.getenv("ADMIN_PATH", "/sdx-secret")

    @property
    def rate_limit_per_minute(self) -> int:
        try:
            limit = int(os.getenv("RATE_LIMIT_PER_MINUTE", "30"))
            return max(1, min(limit, 1000))
        except (ValueError, TypeError):
            return 30

    @property
    def rate_limit_per_hour(self) -> int:
        try:
            limit = int(os.getenv("RATE_LIMIT_PER_HOUR", "500"))
            return max(10, min(limit, 10000))
        except (ValueError, TypeError):
            return 500

    @property
    def jwt_token_expiry_hours(self) -> int:
        try:
            hours = int(os.getenv("JWT_TOKEN_EXPIRY_HOURS", "8"))
            return max(1, min(hours, 24))
        except (ValueError, TypeError):
            return 8

    def _get_config_path(self, filename: str) -> Path:
        """Bug #14 fix - Add error handling for path construction"""
        if not filename:
            raise ValueError("Config filename is required")

        try:
            path = self.config_dir / filename
            if not path.exists():
                path.parent.mkdir(parents=True, exist_ok=True)
            return path
        except (OSError, ValueError, TypeError) as e:
            error_msg = f"Failed to construct config path for '{filename}': {e}"
            logger.error(error_msg)
            raise ValueError(error_msg) from e

    def _load_config_file(self, filename: str) -> Dict[str, Any]:
        try:
            path = self._get_config_path(filename)
            if not path.exists():
                return {}
                
            with open(path, "r", encoding="utf-8") as f:
                config = json.load(f)
                logger.info(f"Loaded config from {path}")
                return config
                
        except FileNotFoundError:
            logger.debug(f"Config file not found: {filename} (optional)")
            return {}
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in config {filename}: {e}")
            return {}
        except Exception as e:
            logger.error(f"Error loading config {filename}: {e}")
            return {}

    def _load_api_config(self) -> Dict[str, Any]:
        filename = os.getenv("API_CONFIG_FILE", "api_config.json")
        config = self._load_config_file(filename)
        if not config:
            return self._get_minimal_api_config()
        return config

    def _get_minimal_api_config(self) -> Dict[str, Any]:
        return {
            "app_info": {
                "name": os.getenv("APP_NAME", "Maemi-Chan Medical AI"),
                "version": os.getenv("APP_VERSION", "v2.1"),
                "developer": os.getenv("APP_DEVELOPER", "Thammaphon Chittasuwanna (SDM)"),
                "company": os.getenv("APP_COMPANY", "SIAM DENSO MANUFACTURING CO., LTD."),
                "supported_languages": ["th", "en", "jp", "id", "zh", "ko", "vi", "es", "fil", "hi"],
            },
            "response_messages": {"ok": "OK"},
            "error_messages": {"generic_error": "An error occurred"},
            "startup_messages": {},
            "log_messages": {},
            "database_messages": {},
        }

    @property
    def api_config(self) -> Dict[str, Any]:
        return self._api_config

    def get_config_messages(self, config_type: str) -> Dict[str, Any]:
        return self._api_config.get(config_type, {})

    def _validate_dir(self, path: str) -> Path:
        """Bug #14 fix - Add error handling for directory path construction"""
        if not path:
            error_msg = "Missing required directory configuration"
            logger.error(error_msg)
            raise ValueError(error_msg)

        try:
            if Path(path).is_absolute():
                full_path = Path(path)
            else:
                full_path = self.project_root / path

            full_path.mkdir(parents=True, exist_ok=True)
            return full_path
        except (OSError, ValueError, TypeError) as e:
            error_msg = f"Failed to create directory '{path}': {e}"
            logger.error(error_msg)
            raise ValueError(error_msg) from e