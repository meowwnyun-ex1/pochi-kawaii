import logging
import json
from pathlib import Path
from typing import Optional, Dict
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class CacheService:
    def __init__(self, config_path: Optional[str] = None):
        if config_path is None:
            config_path = Path(__file__).parent.parent / "config" / "ai_config.json"
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                self.config = json.load(f)
        except Exception as e:
            logger.warning(f"Could not load config: {e}")
            self.config = {"cache_settings": {}}

        cache_config = self.config.get("cache_settings", {})
        self.max_size = cache_config.get("max_size", 500)
        self.ttl_minutes = cache_config.get("ttl_minutes", 30)
        self.enabled = cache_config.get("cache_similar_only", True)
        
        self.cache: Dict[str, Dict] = {}
        self.access_count: Dict[str, int] = {}

    def get(self, key: str) -> Optional[str]:
        if not self.enabled or key not in self.cache:
            return None

        entry = self.cache[key]
        
        if datetime.now() > entry["expires_at"]:
            del self.cache[key]
            if key in self.access_count:
                del self.access_count[key]
            return None

        self.access_count[key] = self.access_count.get(key, 0) + 1
        return entry["value"]

    def set(self, key: str, value: str):
        if not self.enabled:
            return

        if len(self.cache) >= self.max_size:
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k]["created_at"])
            del self.cache[oldest_key]
            if oldest_key in self.access_count:
                del self.access_count[oldest_key]

        self.cache[key] = {
            "value": value,
            "created_at": datetime.now(),
            "expires_at": datetime.now() + timedelta(minutes=self.ttl_minutes)
        }

    def clear(self):
        self.cache.clear()
        self.access_count.clear()
        logger.info("Cache cleared")

    def get_stats(self) -> Dict:
        total_hits = sum(self.access_count.values())
        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "total_hits": total_hits,
            "enabled": self.enabled
        }