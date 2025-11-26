"""
Rate Limiting Middleware using Token Bucket Algorithm
Prevents API abuse and ensures fair resource usage
"""

import time
import logging
from typing import Dict, Tuple
from collections import defaultdict
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import threading

logger = logging.getLogger(__name__)


class TokenBucket:
    """Token bucket implementation for rate limiting"""

    def __init__(self, capacity: int, refill_rate: float):
        """
        Args:
            capacity: Maximum number of tokens
            refill_rate: Tokens added per second
        """
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last_refill = time.time()
        self.lock = threading.Lock()

    def consume(self, tokens: int = 1) -> bool:
        """Try to consume tokens, return True if successful"""
        with self.lock:
            now = time.time()
            # Refill tokens based on time elapsed
            elapsed = now - self.last_refill
            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
            self.last_refill = now

            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False

    def get_wait_time(self) -> float:
        """Get time to wait before retry"""
        with self.lock:
            if self.tokens >= 1:
                return 0.0
            return (1 - self.tokens) / self.refill_rate


class RateLimiter:
    """Rate limiter with per-IP tracking"""

    def __init__(
        self,
        requests_per_minute: int = 30,
        requests_per_hour: int = 500,
        cleanup_interval: int = 3600,
    ):
        """
        Args:
            requests_per_minute: Max requests per minute per IP
            requests_per_hour: Max requests per hour per IP
            cleanup_interval: Seconds between cleanup of old buckets
        """
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.cleanup_interval = cleanup_interval

        # Per-IP buckets (IP -> (minute_bucket, hour_bucket))
        self.buckets: Dict[str, Tuple[TokenBucket, TokenBucket]] = defaultdict(
            lambda: (
                TokenBucket(requests_per_minute, requests_per_minute / 60.0),
                TokenBucket(requests_per_hour, requests_per_hour / 3600.0),
            )
        )

        self.last_cleanup = time.time()
        self.lock = threading.Lock()

        logger.info(
            f"Rate limiter initialized: {requests_per_minute}/min, {requests_per_hour}/hour"
        )

    def _cleanup_old_buckets(self):
        """Remove buckets for IPs that haven't been seen recently"""
        now = time.time()
        if now - self.last_cleanup < self.cleanup_interval:
            return

        with self.lock:
            # Remove buckets older than 2 hours
            old_ips = [
                ip
                for ip, (minute_bucket, _) in self.buckets.items()
                if now - minute_bucket.last_refill > 7200
            ]

            for ip in old_ips:
                del self.buckets[ip]

            if old_ips:
                logger.info(f"Cleaned up {len(old_ips)} old rate limit buckets")

            self.last_cleanup = now

    def check_rate_limit(self, client_ip: str) -> Tuple[bool, float]:
        """
        Check if request is within rate limit

        Returns:
            (allowed: bool, retry_after: float)
        """
        self._cleanup_old_buckets()

        minute_bucket, hour_bucket = self.buckets[client_ip]

        # Check minute limit first
        if not minute_bucket.consume():
            wait_time = minute_bucket.get_wait_time()
            logger.warning(
                f"Rate limit exceeded (minute) for {client_ip}, retry after {wait_time:.1f}s"
            )
            return False, wait_time

        # Check hour limit
        if not hour_bucket.consume():
            wait_time = hour_bucket.get_wait_time()
            logger.warning(
                f"Rate limit exceeded (hour) for {client_ip}, retry after {wait_time:.1f}s"
            )
            return False, wait_time

        return True, 0.0


class LoginRateLimiter:
    """
    Specialized rate limiter for login endpoints to prevent brute force attacks
    Implements stricter limits and temporary lockout after failed attempts
    """

    def __init__(
        self,
        max_attempts: int = 5,
        lockout_duration: int = 900,  # 15 minutes
        cleanup_interval: int = 1800,  # 30 minutes
    ):
        """
        Args:
            max_attempts: Maximum login attempts before lockout
            lockout_duration: Lockout duration in seconds (default: 15 minutes)
            cleanup_interval: Seconds between cleanup of old attempts
        """
        self.max_attempts = max_attempts
        self.lockout_duration = lockout_duration
        self.cleanup_interval = cleanup_interval

        # Track failed attempts per IP: IP -> [(timestamp1, timestamp2, ...)]
        self.attempts: Dict[str, list] = defaultdict(list)
        self.last_cleanup = time.time()
        self.lock = threading.Lock()

        logger.info(
            f"Login rate limiter initialized: {max_attempts} attempts, {lockout_duration}s lockout"
        )

    def _cleanup_old_attempts(self):
        """Remove expired login attempts"""
        now = time.time()
        if now - self.last_cleanup < self.cleanup_interval:
            return

        with self.lock:
            # Remove attempts older than lockout duration
            for ip in list(self.attempts.keys()):
                self.attempts[ip] = [
                    t for t in self.attempts[ip] if now - t < self.lockout_duration
                ]
                # Remove IP if no recent attempts
                if not self.attempts[ip]:
                    del self.attempts[ip]

            self.last_cleanup = now

    def check_login_attempt(self, client_ip: str) -> Tuple[bool, int]:
        """
        Check if login attempt is allowed

        Args:
            client_ip: Client IP address

        Returns:
            (allowed: bool, remaining_attempts: int)
        """
        self._cleanup_old_attempts()

        with self.lock:
            now = time.time()

            # Clean old attempts for this IP
            self.attempts[client_ip] = [
                t for t in self.attempts[client_ip] if now - t < self.lockout_duration
            ]

            current_attempts = len(self.attempts[client_ip])

            if current_attempts >= self.max_attempts:
                oldest_attempt = min(self.attempts[client_ip])
                time_since_oldest = now - oldest_attempt
                remaining_lockout = self.lockout_duration - time_since_oldest

                logger.warning(
                    f"Login attempt blocked for {client_ip}: "
                    f"{current_attempts}/{self.max_attempts} attempts, "
                    f"{remaining_lockout:.0f}s remaining"
                )
                return False, 0

            # Record this attempt
            self.attempts[client_ip].append(now)
            remaining = self.max_attempts - (current_attempts + 1)

            return True, remaining

    def get_lockout_time(self, client_ip: str) -> float:
        """Get remaining lockout time in seconds"""
        with self.lock:
            now = time.time()

            if client_ip not in self.attempts:
                return 0.0

            # Clean old attempts
            self.attempts[client_ip] = [
                t for t in self.attempts[client_ip] if now - t < self.lockout_duration
            ]

            if len(self.attempts[client_ip]) < self.max_attempts:
                return 0.0

            oldest_attempt = min(self.attempts[client_ip])
            time_since_oldest = now - oldest_attempt
            remaining_lockout = self.lockout_duration - time_since_oldest

            return max(0.0, remaining_lockout)

    def reset_attempts(self, client_ip: str):
        """Reset login attempts for an IP (e.g., after successful login)"""
        with self.lock:
            if client_ip in self.attempts:
                del self.attempts[client_ip]
                logger.info(f"Reset login attempts for {client_ip}")


# Global rate limiter instance
_rate_limiter: RateLimiter = None
_login_rate_limiter: LoginRateLimiter = None


def init_rate_limiter(requests_per_minute: int, requests_per_hour: int):
    """Initialize global rate limiter"""
    global _rate_limiter
    _rate_limiter = RateLimiter(requests_per_minute, requests_per_hour)
    logger.info("Rate limiter middleware initialized")


def init_login_rate_limiter(
    max_attempts: int = 5, lockout_duration: int = 900, cleanup_interval: int = 1800
):
    """Initialize global login rate limiter"""
    global _login_rate_limiter
    _login_rate_limiter = LoginRateLimiter(
        max_attempts, lockout_duration, cleanup_interval
    )
    logger.info("Login rate limiter initialized")


def get_login_rate_limiter() -> LoginRateLimiter:
    """Get global login rate limiter instance"""
    if _login_rate_limiter is None:
        # Initialize with defaults if not already initialized
        init_login_rate_limiter()
    return _login_rate_limiter


async def rate_limit_middleware(request: Request, call_next):
    """FastAPI middleware for rate limiting"""
    if _rate_limiter is None:
        # Rate limiter not initialized, skip
        return await call_next(request)

    # Get client IP
    client_ip = request.client.host
    if not client_ip:
        client_ip = request.headers.get("X-Forwarded-For", "unknown")

    # Skip rate limiting for health check endpoints
    if request.url.path in ["/health", "/", "/docs", "/openapi.json"]:
        return await call_next(request)

    # Check rate limit
    allowed, retry_after = _rate_limiter.check_rate_limit(client_ip)

    if not allowed:
        return JSONResponse(
            status_code=429,
            content={
                "error": "Rate limit exceeded",
                "message": f"Too many requests. Please try again in {retry_after:.1f} seconds.",
                "retry_after": retry_after,
            },
            headers={"Retry-After": str(int(retry_after) + 1)},
        )

    # Add rate limit headers
    response = await call_next(request)
    response.headers["X-RateLimit-Limit-Minute"] = str(
        _rate_limiter.requests_per_minute
    )
    response.headers["X-RateLimit-Limit-Hour"] = str(_rate_limiter.requests_per_hour)

    return response
