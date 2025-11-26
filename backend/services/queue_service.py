import asyncio
import logging
import json
from typing import Optional, Dict
from datetime import datetime, timedelta
import uuid
import os
from pathlib import Path

logger = logging.getLogger(__name__)

RESULT_TTL_SECONDS = 300
CLEANUP_INTERVAL = 60

class AIQueueService:
    def __init__(self):
        config_dir_str = os.getenv("CONFIG_DIR", "")
        if config_dir_str:
            config_dir = Path(config_dir_str)
        else:
            config_dir = Path(__file__).parent.parent / "config"

        ai_config_file = os.getenv("AI_CONFIG_FILE", "ai_config.json")
        api_config_file = os.getenv("API_CONFIG_FILE", "api_config.json")
        ai_config_path = config_dir / ai_config_file
        api_config_path = config_dir / api_config_file

        try:
            if ai_config_path and ai_config_path.exists():
                with open(ai_config_path, "r", encoding="utf-8") as f:
                    self.config = json.load(f)
            else:
                self.config = {"queue_settings": {}}
        except Exception as e:
            logger.warning(f"Could not load AI config: {e}")
            self.config = {"queue_settings": {}}

        try:
            if api_config_path and api_config_path.exists():
                with open(api_config_path, "r", encoding="utf-8") as f:
                    api_config = json.load(f)
                self.startup_msgs = api_config.get("startup_messages", {})
                self.log_msgs = api_config.get("log_messages", {})
            else:
                self.startup_msgs = {}
                self.log_msgs = {}
        except Exception as e:
            logger.warning(f"Could not load API config: {e}")
            self.startup_msgs = {}
            self.log_msgs = {}

        queue_config = self.config.get("queue_settings", {})
        self.max_workers = queue_config.get("max_workers", 2)
        self.max_queue_size = queue_config.get("max_queue_size", 50)
        self.task_timeout = queue_config.get("task_timeout", 60)

        self.queue = asyncio.Queue(maxsize=self.max_queue_size)
        self.processing = {}
        self.workers = []
        self.cleanup_task = None
        self.stats = {
            "total_processed": 0,
            "total_queued": 0,
            "total_rejected": 0,
            "active_workers": 0,
            "cache_hits": 0,
        }

    async def start_workers(self, ai_service):
        """Start worker tasks"""
        for i in range(self.max_workers):
            worker = asyncio.create_task(self._worker(i, ai_service))
            self.workers.append(worker)

        self.cleanup_task = asyncio.create_task(self._cleanup_loop())

        msg = self.startup_msgs.get("workers_started", "Started {} AI workers")
        logger.info(msg.format(self.max_workers))

    async def _worker(self, worker_id: int, ai_service):
        """Worker task to process queue"""
        msg = self.startup_msgs.get("worker_started", "Worker {} started")
        logger.info(msg.format(worker_id))
        self.stats["active_workers"] += 1

        consecutive_errors = 0
        max_consecutive_errors = 5  # Prevent infinite error loops

        while True:
            try:
                task = await self.queue.get()
                task_id = task["id"]

                try:
                    logger.info(f"Worker {worker_id} processing task {task_id}")
                    queue_size = task.get("queue_size", 0)

                    response, model = await ai_service.call_ai_hybrid(
                        prompt=task["prompt"],
                        session_id=task["session_id"],
                        lang=task["lang"],
                        queue_size=queue_size,
                    )

                    ai_source = model
                    stat_key = model.replace("-", "_").replace(".", "_") + "_used"

                    if stat_key not in self.stats:
                        self.stats[stat_key] = 0
                    self.stats[stat_key] += 1

                    self.processing[task_id] = {
                        "response": response,
                        "status": "completed",
                        "ai_source": ai_source,
                        "completed_at": datetime.utcnow().isoformat(),
                        "expires_at": datetime.utcnow() + timedelta(seconds=RESULT_TTL_SECONDS),
                    }
                    self.stats["total_processed"] += 1

                    # Reset error counter on success
                    consecutive_errors = 0

                except asyncio.CancelledError:
                    # Handle task cancellation
                    if task_id in self.processing:
                        self.processing[task_id] = {
                            "response": None,
                            "status": "cancelled",
                            "ai_source": "error",
                            "error": "Task cancelled",
                            "completed_at": datetime.utcnow().isoformat(),
                            "expires_at": datetime.utcnow() + timedelta(seconds=RESULT_TTL_SECONDS),
                        }
                    raise

                except Exception as e:
                    logger.error(f"Worker {worker_id} task error: {e}", exc_info=True)
                    self.processing[task_id] = {
                        "response": None,
                        "status": "failed",
                        "error": str(e),
                        "ai_source": "error",
                        "completed_at": datetime.utcnow().isoformat(),
                        "expires_at": datetime.utcnow() + timedelta(seconds=RESULT_TTL_SECONDS),
                    }

                    consecutive_errors += 1

                    # Bug #17 fix - Add backoff after task failures to prevent rapid error loops
                    # If we have multiple consecutive failures, back off before processing next task
                    if consecutive_errors >= 3:
                        backoff_time = min(consecutive_errors * 2, 10)
                        logger.warning(
                            f"Worker {worker_id} has {consecutive_errors} consecutive errors. "
                            f"Backing off for {backoff_time}s before processing next task."
                        )
                        await asyncio.sleep(backoff_time)

                finally:
                    self.queue.task_done()

            except asyncio.CancelledError:
                msg = self.log_msgs.get("worker_cancelled", "Worker {} cancelled")
                logger.info(msg.format(worker_id))
                break

            except Exception as e:
                msg = self.log_msgs.get("worker_unexpected_error", "Worker {} unexpected error: {}")
                logger.error(msg.format(worker_id, e), exc_info=True)

                consecutive_errors += 1

                # Prevent infinite error loop - shut down worker if too many consecutive errors
                if consecutive_errors >= max_consecutive_errors:
                    logger.critical(
                        f"Worker {worker_id} exceeded {max_consecutive_errors} consecutive errors. "
                        "Shutting down to prevent infinite loop."
                    )
                    break

                # Back off before retrying to avoid rapid error loops
                await asyncio.sleep(min(consecutive_errors * 2, 10))

        self.stats["active_workers"] -= 1
        logger.info(f"Worker {worker_id} stopped")

    async def _cleanup_loop(self):
        """Background task to cleanup expired results"""
        logger.info("Started cleanup task")
        
        while True:
            try:
                await asyncio.sleep(CLEANUP_INTERVAL)
                
                now = datetime.utcnow()
                expired = []
                
                for task_id, info in self.processing.items():
                    expires_at = info.get("expires_at")
                    if expires_at and expires_at < now:
                        expired.append(task_id)
                
                for task_id in expired:
                    try:
                        del self.processing[task_id]
                        logger.debug(f"Cleaned up expired task: {task_id}")
                    except KeyError:
                        pass
                
                if expired:
                    logger.info(f"Cleaned up {len(expired)} expired results")
                    
            except asyncio.CancelledError:
                logger.info("Cleanup task cancelled")
                break
            except Exception as e:
                logger.error(f"Cleanup error: {e}")

    async def add_task(
        self, prompt: str, session_id: str, lang: str = "en", queue_size: int = 0
    ) -> Optional[str]:
        """Add task to queue"""
        try:
            task_id = str(uuid.uuid4())
            task = {
                "id": task_id,
                "prompt": prompt,
                "session_id": session_id,
                "lang": lang,
                "queue_size": queue_size,
                "created_at": datetime.utcnow().isoformat(),
            }

            self.processing[task_id] = {
                "status": "queued",
                "response": None,
                "ai_source": "unknown",
                "created_at": task["created_at"],
                "completed_at": None,
                "expires_at": datetime.utcnow() + timedelta(seconds=RESULT_TTL_SECONDS),
            }

            self.queue.put_nowait(task)
            self.stats["total_queued"] += 1

            msg = self.log_msgs.get("task_queued", "Task {} added to queue (size: {})")
            logger.info(msg.format(task_id, self.queue.qsize()))

            return task_id

        except asyncio.QueueFull:
            self.stats["total_rejected"] += 1
            msg = self.log_msgs.get("queue_full_warning", "Queue is full, rejecting task")
            logger.warning(msg)
            return None
        except Exception as e:
            logger.error(f"Error adding task: {e}")
            return None

    async def get_result(self, task_id: str, timeout: Optional[int] = None) -> Dict:
        """Get task result with timeout"""
        if task_id not in self.processing:
            return {"status": "not_found", "response": None, "ai_source": "error"}

        timeout = timeout or self.task_timeout

        try:
            result = await asyncio.wait_for(
                self._wait_for_completion(task_id),
                timeout=timeout
            )
            return result
            
        except asyncio.TimeoutError:
            logger.warning(f"Task {task_id} timed out after {timeout}s")
            return {
                "status": "timeout",
                "response": None,
                "ai_source": "error",
                "error": "Request timeout",
            }

    async def _wait_for_completion(self, task_id: str) -> Dict:
        """Wait for task to complete with safety checks"""
        max_iterations = 500  # 500 * 0.2 = 100 seconds max wait (safety net)
        iterations = 0

        while iterations < max_iterations:
            if task_id not in self.processing:
                return {"status": "not_found", "response": None, "ai_source": "error"}

            task_info = self.processing[task_id]

            if task_info["status"] in ["completed", "failed", "cancelled"]:
                result = {
                    "status": task_info["status"],
                    "response": task_info["response"],
                    "ai_source": task_info.get("ai_source", "unknown"),
                    "error": task_info.get("error"),
                }

                return result

            await asyncio.sleep(0.2)
            iterations += 1

        # Safety net: if we hit max iterations, return timeout
        logger.error(f"Task {task_id} exceeded max wait iterations (possible infinite loop)")
        return {
            "status": "timeout",
            "response": None,
            "ai_source": "error",
            "error": "Internal timeout - exceeded max wait time"
        }

    def get_stats(self) -> Dict:
        """Get queue statistics"""
        return {
            **self.stats,
            "queue_size": self.queue.qsize(),
            "processing_count": len(self.processing),
        }

    async def shutdown(self):
        """Shutdown queue service with cleanup"""
        msg = self.startup_msgs.get("shutting_down_workers", "Shutting down workers...")
        logger.info(msg)

        # Cancel cleanup task
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await asyncio.wait_for(self.cleanup_task, timeout=2.0)
            except (asyncio.CancelledError, asyncio.TimeoutError):
                pass
            except Exception as e:
                logger.error(f"Error cancelling cleanup task: {e}")

        # Cancel all workers
        for worker in self.workers:
            worker.cancel()

        # Wait for workers to finish with timeout
        if self.workers:
            try:
                done, pending = await asyncio.wait(self.workers, timeout=5.0)
                if pending:
                    logger.warning(f"{len(pending)} workers did not shut down gracefully")
                    # Force cancel pending tasks
                    for task in pending:
                        task.cancel()
            except Exception as e:
                logger.error(f"Error waiting for workers: {e}")

        # Mark remaining tasks as cancelled (with safety limit)
        cancelled_count = 0
        max_cancellations = 100  # Safety limit to prevent infinite loop

        while not self.queue.empty() and cancelled_count < max_cancellations:
            try:
                task = self.queue.get_nowait()
                task_id = task.get("id")
                if task_id and task_id in self.processing:
                    self.processing[task_id] = {
                        "status": "cancelled",
                        "error": "Server shutdown",
                        "ai_source": "error",
                        "completed_at": datetime.utcnow().isoformat(),
                    }
                cancelled_count += 1
            except Exception:
                break

        if cancelled_count > 0:
            logger.info(f"Cancelled {cancelled_count} pending tasks")

        # Warn if we hit the cancellation limit (Bug #12 fix)
        if cancelled_count >= max_cancellations and not self.queue.empty():
            remaining = self.queue.qsize()
            logger.warning(
                f"Hit cancellation limit ({max_cancellations}). "
                f"There are still {remaining} tasks in queue that were not cancelled. "
                f"Consider increasing max_cancellations if this happens frequently."
            )

        msg = self.startup_msgs.get("all_workers_stopped", "All workers stopped")
        logger.info(msg)