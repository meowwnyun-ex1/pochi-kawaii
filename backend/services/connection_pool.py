import os
import pyodbc
import logging
import re
from typing import Optional
from queue import Queue, Empty
from threading import Lock
from contextlib import contextmanager
import time

logger = logging.getLogger(__name__)


class ConnectionPoolExhausted(Exception):
    """Raised when connection pool is exhausted and no connections available"""
    pass


# Bug #19 fix - Add connection lifetime management (1 hour default)
MAX_CONNECTION_LIFETIME = 3600  # seconds (1 hour)


class ConnectionWrapper:
    """Bug #19 fix - Wrapper to track connection creation time for lifetime management"""
    def __init__(self, connection: pyodbc.Connection):
        self.connection = connection
        self.created_at = time.time()

    def is_expired(self, max_lifetime: int = MAX_CONNECTION_LIFETIME) -> bool:
        """Check if connection has exceeded its lifetime"""
        return (time.time() - self.created_at) > max_lifetime

    def close(self):
        """Close the underlying connection"""
        try:
            self.connection.close()
        except Exception as e:
            logger.debug(f"Error closing connection: {e}")


def mask_sensitive_data(conn_str: str) -> str:
    """
    Mask sensitive data in connection string for safe logging
    Masks: PWD, PASSWORD, UID values
    """
    if not conn_str:
        return conn_str

    # Mask password
    masked = re.sub(r'(PWD=)([^;]+)', r'\1***MASKED***', conn_str, flags=re.IGNORECASE)
    masked = re.sub(r'(PASSWORD=)([^;]+)', r'\1***MASKED***', masked, flags=re.IGNORECASE)
    # Partially mask UID (show first 2 chars only)
    masked = re.sub(r'(UID=)([^;]+)', lambda m: f"{m.group(1)}{m.group(2)[:2]}***", masked, flags=re.IGNORECASE)
    return masked


def detect_available_odbc_driver() -> str:
    """
    🔍 Auto-detect which ODBC Driver for SQL Server is installed
    Tries in order: 18 → 17 → 13 → 11 → Generic SQL Server

    Returns:
        str: Driver name (e.g., "ODBC Driver 18 for SQL Server")

    Raises:
        RuntimeError: If no compatible driver found
    """
    available_drivers = pyodbc.drivers()
    logger.info(f"🔍 Detecting ODBC drivers... Found: {available_drivers}")

    # Try drivers in order of preference (newest first)
    preferred_drivers = [
        "ODBC Driver 18 for SQL Server",
        "ODBC Driver 17 for SQL Server",
        "ODBC Driver 13 for SQL Server",
        "SQL Server Native Client 11.0",
        "SQL Server"
    ]

    for driver in preferred_drivers:
        if driver in available_drivers:
            logger.info(f"✅ Using ODBC driver: {driver}")
            return driver

    # No compatible driver found
    error_msg = (
        f"❌ No compatible ODBC driver found!\n"
        f"   Available drivers: {available_drivers}\n"
        f"   Required: ODBC Driver 17 or 18 for SQL Server"
    )
    logger.error(error_msg)
    raise RuntimeError(error_msg)


def fix_connection_string(conn_str: str) -> str:
    """
    🔧 Auto-fix DATABASE_URL for ODBC:
    1. Detect and use correct ODBC driver (18/17/13)
    2. Add {} around values with special characters (@, -, etc.)
    """
    if not conn_str:
        logger.error("[DB] ❌ Empty connection string received!")
        return conn_str

    original = conn_str
    changes_made = []

    # Always log what we received (with masked sensitive data)
    masked = mask_sensitive_data(original)
    logger.info(f"[DB] Received connection string ({len(original)} chars)")
    logger.info(f"[DB] Connection string: {masked}")

    # Step 1: Auto-detect and replace DRIVER
    try:
        detected_driver = detect_available_odbc_driver()
        # Replace any existing DRIVER= value with detected one
        old_driver_match = re.search(r'DRIVER=\{([^}]+)\}', conn_str, re.IGNORECASE)
        if old_driver_match:
            old_driver = old_driver_match.group(1)
            if old_driver != detected_driver:
                conn_str = re.sub(
                    r'DRIVER=\{[^}]+\}',
                    f'DRIVER={{{detected_driver}}}',
                    conn_str,
                    flags=re.IGNORECASE
                )
                changes_made.append(f"DRIVER (changed from {old_driver} to {detected_driver})")
                logger.info(f"[DB] Replaced DRIVER: {old_driver} → {detected_driver}")
            else:
                logger.info(f"[DB] Driver already correct: {detected_driver}")
        else:
            logger.warning("[DB] No DRIVER= found in connection string!")
    except RuntimeError as e:
        logger.error(f"[DB] ❌ Driver detection failed: {e}")
        raise

    # Step 2: Parse and fix special characters in values
    parts = conn_str.split(';')
    fixed_parts = []

    for part in parts:
        if not part.strip():
            continue

        if '=' in part:
            key, value = part.split('=', 1)
            key = key.strip()
            value = value.strip()

            # Skip if already has brackets or braces
            if (value.startswith('{') and value.endswith('}')) or (value.startswith('[') and value.endswith(']')):
                fixed_parts.append(f"{key}={value}")
                continue

            # Add braces for problematic values
            needs_braces = False
            reason = ""

            if key.upper() == 'UID' and '@' in value:
                needs_braces = True
                reason = "UID has @"
            elif key.upper() == 'DATABASE' and '-' in value:
                needs_braces = True
                reason = "DATABASE has -"
            elif key.upper() == 'PWD' and any(c in value for c in ['@', '!', '#', '$', '%', '^', '&', '*', '(', ')']):
                needs_braces = True
                reason = "PWD has special chars"

            if needs_braces:
                fixed_parts.append(f"{key}={{{value}}}")
                if f"{key} ({reason})" not in changes_made:
                    changes_made.append(f"{key} ({reason})")
            else:
                fixed_parts.append(f"{key}={value}")
        else:
            fixed_parts.append(part)

    conn_str = ';'.join(fixed_parts)

    if changes_made:
        logger.info(f"[DB] OK Auto-fixed: {', '.join(changes_made)}")
        logger.info(f"[DB] Final connection string: {mask_sensitive_data(conn_str)}")
    else:
        logger.info(f"[DB] OK No changes needed")
        logger.info(f"[DB] Final connection string: {mask_sensitive_data(conn_str)}")

    return conn_str


class ConnectionPool:
    def __init__(self, connection_string: str, pool_size: int = 5, max_overflow: int = 10, timeout: int = 30):
        """
        Initialize connection pool with auto-fix for DATABASE_URL special characters
        """
        logger.info("[ConnectionPool] Initializing with auto-fix enabled")

        # Auto-fix connection string format (adds {} around values with special chars)
        self.connection_string = fix_connection_string(connection_string)

        self.pool_size = max(1, min(pool_size, 50))  # ✅ Validate
        self.max_overflow = max(0, min(max_overflow, 50))
        self.timeout = max(5, min(timeout, 300))

        self._pool = Queue(maxsize=self.pool_size + self.max_overflow)
        self._lock = Lock()
        self._current_size = 0
        self._active_connections = 0  # ✅ Track active

        logger.info(f"[ConnectionPool] Configuration: pool_size={self.pool_size}, max_overflow={self.max_overflow}, timeout={self.timeout}s")

        self._initialize_pool()

    def _initialize_pool(self):
        """Initialize connection pool"""
        logger.info(f"Initializing connection pool: size={self.pool_size}, overflow={self.max_overflow}")
        
        for i in range(self.pool_size):
            try:
                conn = self._create_connection()
                if conn:
                    self._pool.put(conn)
                    self._current_size += 1
                    logger.debug(f"Created connection {i+1}/{self.pool_size}")
            except Exception as e:
                logger.error(f"Failed to initialize connection {i+1}: {e}")
        
        if self._current_size == 0:
            logger.error("Failed to create any connections!")
        else:
            logger.info(f"Pool initialized with {self._current_size} connections")

    def _create_connection(self) -> Optional[ConnectionWrapper]:
        """Bug #19 fix - Create a new database connection wrapped for lifetime tracking"""
        try:
            # Debug: Log the exact connection string being used (masked)
            logger.info(f"[DB] Attempting connection with: {mask_sensitive_data(self.connection_string)}")

            conn = pyodbc.connect(
                self.connection_string,
                timeout=self.timeout,
                autocommit=False  # ✅ Explicit transaction control
            )
            logger.debug("Created new connection")
            return ConnectionWrapper(conn)  # Wrap connection
        except pyodbc.Error as e:
            logger.error(f"Failed to create connection: {e}")
            logger.error(f"Connection string used: {mask_sensitive_data(self.connection_string)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error creating connection: {e}")
            return None

    def _validate_connection(self, conn_wrapper: ConnectionWrapper) -> bool:
        """Bug #19 fix - Check if connection is still alive and not expired"""
        if not conn_wrapper:
            return False

        # Check if connection has exceeded its lifetime
        if conn_wrapper.is_expired():
            logger.debug("Connection expired, will be recycled")
            return False

        try:
            cursor = conn_wrapper.connection.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            return True
        except Exception as e:
            logger.warning(f"Connection validation failed: {e}")
            return False

    @contextmanager
    def get_connection(self, retry_count: int = 2):
        """Get a connection from pool with context manager"""
        conn = None
        conn_acquired = False

        # Retry logic OUTSIDE the try-finally to avoid complex nesting
        for retry_attempt in range(retry_count + 1):
            try:
                # Try to get from pool
                try:
                    conn = self._pool.get(timeout=10)
                    logger.debug("Got connection from pool")
                except Empty:
                    # Pool is empty, try to create overflow connection
                    with self._lock:
                        if self._current_size < (self.pool_size + self.max_overflow):
                            logger.debug("Creating overflow connection")
                            conn = self._create_connection()
                            if conn:
                                self._current_size += 1
                        else:
                            logger.warning("Connection pool exhausted")
                            raise ConnectionPoolExhausted("Connection pool exhausted, please wait")

                # Bug #19 fix - Validate connection (checks expiry and health)
                if conn and not self._validate_connection(conn):
                    logger.warning("Invalid or expired connection, recreating")
                    try:
                        conn.close()
                    except Exception as e:
                        logger.error(f"Failed to close connection: {e}")

                    with self._lock:
                        self._current_size -= 1

                    conn = self._create_connection()
                    if conn:
                        with self._lock:
                            self._current_size += 1

                    if not conn:
                        raise Exception("Failed to create valid connection")

                # Track active connection
                if conn:
                    with self._lock:
                        self._active_connections += 1
                    conn_acquired = True

                    # Success - yield unwrapped connection and break retry loop
                    try:
                        yield conn.connection  # Yield the actual pyodbc.Connection
                    finally:
                        # Cleanup after yield
                        self._return_connection(conn)
                        conn_acquired = False

                    # If we got here, connection was successful
                    break

            except Exception as e:
                # Clean up connection if it was acquired but not yet returned
                if conn_acquired and conn:
                    try:
                        self._return_connection(conn)
                        conn_acquired = False
                    except Exception as cleanup_error:
                        logger.error(f"Error during connection cleanup: {cleanup_error}")

                # Check if we should retry
                if retry_attempt < retry_count:
                    logger.error(f"Error getting connection (attempt {retry_attempt + 1}/{retry_count + 1}): {e}")
                    time.sleep(min(0.5 * (retry_attempt + 1), 3.0))  # Max 3 second backoff
                    continue
                else:
                    # Out of retries, raise the error
                    logger.error(f"Failed to get connection after {retry_count + 1} attempts")
                    raise

    def _return_connection(self, conn_wrapper: ConnectionWrapper):
        """Bug #19 fix - Return connection wrapper to pool or close it"""
        if not conn_wrapper:
            return

        # Decrement active connections
        with self._lock:
            self._active_connections -= 1

        # Try to return to pool or close
        try:
            if self._validate_connection(conn_wrapper):
                try:
                    self._pool.put_nowait(conn_wrapper)
                    logger.debug("Returned connection to pool")
                except Exception as e:
                    logger.error(f"Failed to return connection to pool: {e}")
                    conn_wrapper.close()
                    with self._lock:
                        self._current_size -= 1
                    logger.debug("Pool full, closed connection")
            else:
                # Invalid or expired connection, close it
                conn_wrapper.close()
                with self._lock:
                    self._current_size -= 1
                logger.debug("Closed invalid connection")
        except Exception as e:
            logger.error(f"Error returning connection: {e}")

    def get_stats(self) -> dict:
        """Get pool statistics"""
        return {
            "pool_size": self.pool_size,
            "current_size": self._current_size,
            "active_connections": self._active_connections,
            "available": self._pool.qsize(),
            "max_overflow": self.max_overflow
        }

    def close_all(self):
        """Bug #19 fix - Close all connection wrappers in pool"""
        logger.info("Closing all connections")

        closed_count = 0
        while not self._pool.empty():
            try:
                conn_wrapper = self._pool.get_nowait()
                conn_wrapper.close()  # Use wrapper's close method
                closed_count += 1
            except Empty:
                break
            except Exception as e:
                logger.error(f"Error closing connection: {e}")
        
        self._current_size = 0
        logger.info(f"Closed {closed_count} connections")
        
        if self._active_connections > 0:
            logger.warning(f"{self._active_connections} connections still active!")