from fastapi import APIRouter
from datetime import datetime
import logging
import json
import os
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter()


def setup_health_routes(
    app, config, db_manager, ai_service, queue_service, cache_service
):
    config_dir_str = os.getenv("CONFIG_DIR", "config")
    config_dir = Path(config_dir_str) if config_dir_str else Path("config")
    if not config_dir.is_absolute():
        config_dir = Path(__file__).parent.parent.parent / config_dir

    api_config_file = os.getenv("API_CONFIG_FILE", "api_config.json")
    api_config_path = config_dir / api_config_file

    try:
        if api_config_path.exists():
            with open(api_config_path, "r", encoding="utf-8") as f:
                api_config = json.load(f)
            endpoints = api_config.get("endpoints", {})
            app_info = api_config.get("app_info", {})
        else:
            logger.warning(f"api_config.json not found at {api_config_path}")
            endpoints = {}
            app_info = {}
    except Exception as e:
        logger.warning(f"Could not load api_config.json: {api_config_path} ({e})")
        endpoints = {}
        app_info = {}

    @router.get("/")
    async def root():
        queue_stats = queue_service.get_stats()
        cache_stats = cache_service.get_stats()

        ai_info = {
            "status": "enabled",
            "learning_enabled": config.enable_learning
        }

        learning_stats = {}
        if config.enable_learning:
            try:
                learning_stats = ai_service.learning_service.get_learning_stats()
            except (AttributeError, Exception) as e:
                logger.debug(f"Failed to get learning stats: {e}")
                learning_stats = {}

        return {
            "message": app_info.get("description", ""),
            "status": "running",
            "version": app_info.get("version", ""),
            "developer": app_info.get("developer", ""),
            "company": app_info.get("company", ""),
            "copyright": app_info.get("copyright", ""),
            "endpoints": endpoints,
            "ai_service": ai_info,
            "learning": {
                "enabled": config.enable_learning,
                "stats": learning_stats,
            },
            "environment": config.environment,
            "debug_mode": config.enable_debug,
            "supported_languages": app_info.get("supported_languages", []),
            "queue_stats": queue_stats,
            "cache_stats": cache_stats,
        }

    @router.get("/health")
    async def health_check():
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "components": {},
        }

        try:
            if db_manager.connection_available and db_manager.pool:
                try:
                    with db_manager.pool.get_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("SELECT 1")
                        result = cursor.fetchone()
                        cursor.close()
                        
                        if result:
                            health_status["components"]["database"] = "connected"
                        else:
                            health_status["components"]["database"] = "error"
                            health_status["status"] = "degraded"
                            
                except Exception as conn_error:
                    health_status["components"]["database"] = "connection_error"
                    health_status["status"] = "degraded"
                    logger.error(f"Database health check failed: {conn_error}")
            else:
                health_status["components"]["database"] = "unavailable"
                health_status["status"] = "degraded"
        except Exception as e:
            health_status["components"]["database"] = "error"
            health_status["status"] = "degraded"
            logger.error(f"Health check error: {e}")

        health_status["components"]["ai_service"] = {
            "provider": "HuggingFace",
            "model": config.huggingface_model,
            "status": "configured",
            "mode": "huggingface_only"
        }

        health_status["components"]["environment"] = (
            "loaded" if config.database_url else "missing_config"
        )
        health_status["components"]["queue"] = queue_service.get_stats()
        health_status["components"]["cache"] = cache_service.get_stats()
        
        if db_manager.pool:
            health_status["components"]["connection_pool"] = db_manager.pool.get_stats()

        return health_status

    @router.get("/health/ai")
    async def ai_health_check():
        """Test HuggingFace API connection"""
        import httpx

        health = {
            "timestamp": datetime.utcnow().isoformat(),
            "provider": "HuggingFace",
            "model": config.huggingface_model,
            "status": "unknown",
            "message": ""
        }

        try:
            timeout = httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)

            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    f"{config.huggingface_base_url}/{config.huggingface_model}",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {config.huggingface_api_token}",
                    },
                    json={
                        "inputs": "test"
                    }
                )

                if response.status_code == 200:
                    health["status"] = "connected"
                    health["message"] = "✅ HuggingFace API is working"
                    logger.info("✅ HuggingFace API health check passed")
                elif response.status_code == 401:
                    health["status"] = "auth_failed"
                    health["message"] = "❌ Authentication failed - check HUGGINGFACE_API_TOKEN"
                    logger.error("❌ HuggingFace API authentication failed")
                elif response.status_code == 429:
                    health["status"] = "rate_limited"
                    health["message"] = "⚠️ Rate limited - API is working but quota exceeded"
                    logger.warning("⚠️ HuggingFace API rate limited")
                else:
                    health["status"] = "error"
                    health["message"] = f"❌ HTTP {response.status_code}"
                    logger.error(f"❌ HuggingFace API returned {response.status_code}")

        except httpx.ConnectError as e:
            health["status"] = "connection_failed"
            health["message"] = f"❌ Cannot connect to HuggingFace API: {str(e)}"
            logger.error(f"❌ HuggingFace API connection failed: {e}")
        except httpx.TimeoutException:
            health["status"] = "timeout"
            health["message"] = "❌ Connection timeout"
            logger.error("❌ HuggingFace API timeout")
        except Exception as e:
            health["status"] = "error"
            health["message"] = f"❌ Error: {str(e)}"
            logger.error(f"❌ HuggingFace API health check error: {e}")

        return health

    @router.get("/api/stats")
    async def get_stats():
        queue_stats = queue_service.get_stats()
        cache_stats = cache_service.get_stats()

        hf_stat_key = config.huggingface_model.replace("-", "_").replace(".", "_").replace("/", "_") + "_used"
        total_requests = queue_stats.get(hf_stat_key, 0)

        learning_stats = {}
        if config.enable_learning:
            try:
                learning_stats = ai_service.learning_service.get_learning_stats()
            except (AttributeError, Exception) as e:
                logger.debug(f"Failed to get learning stats: {e}")
                learning_stats = {}

        ai_usage = {
            "provider": "HuggingFace",
            "model": config.huggingface_model,
            "mode": "huggingface_only",
            "total_requests": total_requests,
            "cache_hits": queue_stats.get("cache_hits", 0),
            "learned_responses": queue_stats.get("learned", 0) if config.enable_learning else 0
        }

        return {
            "queue": queue_stats,
            "cache": cache_stats,
            "ai_usage": ai_usage,
            "learning": learning_stats if config.enable_learning else {"enabled": False},
            "timestamp": datetime.utcnow().isoformat(),
        }

    @router.get("/metrics")
    async def prometheus_metrics():
        """
        Prometheus-compatible metrics endpoint for monitoring tools
        (Netdata, Prometheus, Grafana, etc.)
        """
        queue_stats = queue_service.get_stats()
        cache_stats = cache_service.get_stats()

        # Database connection pool stats
        pool_stats = db_manager.pool.get_stats() if db_manager.pool else {}

        # Build metrics in Prometheus format
        metrics = []

        # Application info
        metrics.append('# HELP maemi_app_info Application information')
        metrics.append('# TYPE maemi_app_info gauge')
        metrics.append(f'maemi_app_info{{version="{app_info.get("version", "unknown")}",environment="{config.environment}"}} 1')

        # Queue metrics
        metrics.append('# HELP maemi_queue_size Current queue size')
        metrics.append('# TYPE maemi_queue_size gauge')
        metrics.append(f'maemi_queue_size {queue_stats.get("queue_size", 0)}')

        metrics.append('# HELP maemi_queue_processing Currently processing requests')
        metrics.append('# TYPE maemi_queue_processing gauge')
        metrics.append(f'maemi_queue_processing {queue_stats.get("processing", 0)}')

        metrics.append('# HELP maemi_total_requests_total Total requests processed')
        metrics.append('# TYPE maemi_total_requests_total counter')
        hf_stat_key = config.huggingface_model.replace("-", "_").replace(".", "_").replace("/", "_") + "_used"
        metrics.append(f'maemi_total_requests_total {queue_stats.get(hf_stat_key, 0)}')

        # Cache metrics
        metrics.append('# HELP maemi_cache_size Current cache size')
        metrics.append('# TYPE maemi_cache_size gauge')
        metrics.append(f'maemi_cache_size {cache_stats.get("size", 0)}')

        metrics.append('# HELP maemi_cache_hits_total Total cache hits')
        metrics.append('# TYPE maemi_cache_hits_total counter')
        metrics.append(f'maemi_cache_hits_total {cache_stats.get("hits", 0)}')

        metrics.append('# HELP maemi_cache_misses_total Total cache misses')
        metrics.append('# TYPE maemi_cache_misses_total counter')
        metrics.append(f'maemi_cache_misses_total {cache_stats.get("misses", 0)}')

        # Database metrics
        if pool_stats:
            metrics.append('# HELP maemi_db_pool_active Active database connections')
            metrics.append('# TYPE maemi_db_pool_active gauge')
            metrics.append(f'maemi_db_pool_active {pool_stats.get("active", 0)}')

            metrics.append('# HELP maemi_db_pool_size Total database connection pool size')
            metrics.append('# TYPE maemi_db_pool_size gauge')
            metrics.append(f'maemi_db_pool_size {pool_stats.get("size", 0)}')

        # Database status
        metrics.append('# HELP maemi_db_available Database availability')
        metrics.append('# TYPE maemi_db_available gauge')
        db_available = 1 if (db_manager.connection_available and db_manager.pool) else 0
        metrics.append(f'maemi_db_available {db_available}')

        # Learning metrics (if enabled)
        if config.enable_learning:
            try:
                learning_stats = ai_service.learning_service.get_learning_stats()

                metrics.append('# HELP maemi_learned_responses_total Total learned responses')
                metrics.append('# TYPE maemi_learned_responses_total counter')
                metrics.append(f'maemi_learned_responses_total {learning_stats.get("total_learned", 0)}')

                metrics.append('# HELP maemi_learning_enabled Learning feature status')
                metrics.append('# TYPE maemi_learning_enabled gauge')
                metrics.append('maemi_learning_enabled 1')
            except Exception as e:
                logger.debug(f"Failed to get learning stats: {e}")
                metrics.append('maemi_learning_enabled 0')
        else:
            metrics.append('# HELP maemi_learning_enabled Learning feature status')
            metrics.append('# TYPE maemi_learning_enabled gauge')
            metrics.append('maemi_learning_enabled 0')

        # Return as plain text
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(content="\n".join(metrics) + "\n", media_type="text/plain; version=0.0.4")

    app.include_router(router)