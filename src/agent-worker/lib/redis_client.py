"""
Redis client for the APF Agent Worker.

Implements:
- fetch_job        — blocking-pop a job from `queue:tasks`
- update_status    — update `job:{id}:status` Hash
- publish_log      — publish a `LogMessage` to `channel:logs:{job_id}`
- acquire_job_lock — SET NX distributed lock so only one worker claims a job
- release_job_lock — DEL the lock after completion
- get_session_memory   — read session short-term memory
- append_session_turn  — push a new conversation turn (capped at MAX_TURNS)
"""

from __future__ import annotations

import json
import os
import socket
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

import redis as redis_lib
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------


class JobStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class LogLevel(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"
    AGENT_THOUGHT = "AGENT_THOUGHT"
    AGENT_ACTION = "AGENT_ACTION"
    AGENT_RESULT = "AGENT_RESULT"


class ConversationRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


# ---------------------------------------------------------------------------
# Pydantic schemas (mirrors src/shared/types.ts)
# ---------------------------------------------------------------------------


class JobMessage(BaseModel):
    job_id: str
    session_id: str
    persona_id: str
    task_type: str
    payload: dict[str, Any]
    created_at: str  # ISO 8601


class JobStatusRecord(BaseModel):
    job_id: str
    session_id: str
    persona_id: str
    status: JobStatus
    worker_id: Optional[str] = None
    created_at: str
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    error: Optional[str] = None
    result: Optional[str] = None  # JSON-serialised output


class LogMessage(BaseModel):
    job_id: str
    level: LogLevel
    source: str  # persona_id or worker identifier
    message: str
    timestamp: str  # ISO 8601
    metadata: Optional[dict[str, Any]] = None


class ConversationTurn(BaseModel):
    role: ConversationRole
    content: str
    timestamp: str
    agent_id: Optional[str] = None


class SessionMemory(BaseModel):
    session_id: str
    persona_id: str
    user_id: str
    turns: list[ConversationTurn] = Field(default_factory=list)
    turn_count: int = 0
    created_at: str
    last_active: str


# ---------------------------------------------------------------------------
# TTL / limit constants
# ---------------------------------------------------------------------------

TTL_JOB_STATUS = 86_400   # 24 hours
TTL_SESSION_MEMORY = 43_200  # 12 hours
TTL_JOB_LOCK = 30          # 30 seconds (auto-release if worker crashes)
MAX_MEMORY_TURNS = 10

# ---------------------------------------------------------------------------
# Redis key helpers
# ---------------------------------------------------------------------------

TASK_QUEUE = "queue:tasks"


def key_job_status(job_id: str) -> str:
    return f"job:{job_id}:status"


def key_log_channel(job_id: str) -> str:
    return f"channel:logs:{job_id}"


def key_session_memory(session_id: str) -> str:
    return f"session:{session_id}:memory"


def key_job_lock(job_id: str) -> str:
    return f"lock:job:{job_id}"


# ---------------------------------------------------------------------------
# Worker identity helper
# ---------------------------------------------------------------------------

def _worker_id() -> str:
    """Stable worker identifier: hostname + PID."""
    return f"{socket.gethostname()}_{os.getpid()}"


# ---------------------------------------------------------------------------
# Connection
# ---------------------------------------------------------------------------

_REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")


def _make_client() -> redis_lib.Redis:
    return redis_lib.Redis.from_url(
        _REDIS_URL,
        decode_responses=True,
        socket_connect_timeout=5,
        retry_on_timeout=True,
    )


# Module-level singleton
_client: Optional[redis_lib.Redis] = None


def get_client() -> redis_lib.Redis:
    """Return the shared Redis client, creating it on first call."""
    global _client
    if _client is None:
        _client = _make_client()
    return _client


# ---------------------------------------------------------------------------
# Task Queue
# ---------------------------------------------------------------------------


def fetch_job(timeout: int = 0) -> Optional[JobMessage]:
    """
    Blocking-pop the next job from `queue:tasks`.

    Params:
        timeout: seconds to block (0 = block indefinitely).

    Returns:
        A validated `JobMessage`, or `None` if the timeout elapsed.

    Usage:
        while True:
            job = fetch_job(timeout=5)
            if job:
                process(job)
    """
    result = get_client().brpop(TASK_QUEUE, timeout=timeout)
    if result is None:
        return None

    _queue_name, raw = result
    data = json.loads(raw)
    return JobMessage.model_validate(data)


# ---------------------------------------------------------------------------
# Task Status
# ---------------------------------------------------------------------------


def update_status(
    job_id: str,
    status: JobStatus,
    *,
    error: Optional[str] = None,
    result: Optional[Any] = None,
) -> None:
    """
    Update the `job:{job_id}:status` Hash.

    Automatically sets `started_at` when transitioning to RUNNING,
    and `finished_at` when transitioning to COMPLETED or FAILED.
    Resets the 24-hour TTL on every update.

    Params:
        job_id:  The job identifier.
        status:  New `JobStatus` value.
        error:   Error message (only relevant when status=FAILED).
        result:  Output payload (only relevant when status=COMPLETED);
                 will be JSON-serialised if not already a string.
    """
    client = get_client()
    key = key_job_status(job_id)
    now = datetime.now(timezone.utc).isoformat()

    fields: dict[str, str] = {
        "status": status.value,
        "worker_id": _worker_id(),
    }

    if status == JobStatus.RUNNING:
        fields["started_at"] = now
    elif status in (JobStatus.COMPLETED, JobStatus.FAILED):
        fields["finished_at"] = now

    if error is not None:
        fields["error"] = error

    if result is not None:
        fields["result"] = result if isinstance(result, str) else json.dumps(result)

    pipe = client.pipeline()
    pipe.hset(key, mapping=fields)
    pipe.expire(key, TTL_JOB_STATUS)
    pipe.execute()


# ---------------------------------------------------------------------------
# Streaming Logs
# ---------------------------------------------------------------------------


def publish_log(
    job_id: str,
    message: str,
    level: LogLevel = LogLevel.INFO,
    source: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> int:
    """
    Publish a log entry to `channel:logs:{job_id}`.

    The Bun API server subscribes to this channel and forwards the messages
    to the browser over WebSocket.

    Params:
        job_id:   The job this log belongs to.
        message:  Human-readable log text.
        level:    Severity / log level (default INFO).
        source:   Originating persona or component (defaults to worker_id).
        metadata: Optional arbitrary key-value data attached to the log.

    Returns:
        Number of subscribers that received the message.
    """
    log = LogMessage(
        job_id=job_id,
        level=level,
        source=source or _worker_id(),
        message=message,
        timestamp=datetime.now(timezone.utc).isoformat(),
        metadata=metadata,
    )
    return get_client().publish(
        key_log_channel(job_id),
        log.model_dump_json(),
    )


# ---------------------------------------------------------------------------
# Distributed Locking
# ---------------------------------------------------------------------------


def acquire_job_lock(job_id: str) -> bool:
    """
    Attempt to acquire a distributed lock for the given job.

    Uses Redis SET NX EX so only one worker can claim the job at a time.
    The lock auto-expires after `TTL_JOB_LOCK` seconds to handle worker
    crashes gracefully.

    Returns:
        True if the lock was acquired, False if another worker holds it.
    """
    result = get_client().set(
        key_job_lock(job_id),
        _worker_id(),
        nx=True,
        ex=TTL_JOB_LOCK,
    )
    return result is not None


def release_job_lock(job_id: str) -> None:
    """
    Release the distributed lock for the given job.
    Should always be called after the job finishes (success or failure).
    """
    get_client().delete(key_job_lock(job_id))


# ---------------------------------------------------------------------------
# Session Memory
# ---------------------------------------------------------------------------


def get_session_memory(session_id: str) -> Optional[SessionMemory]:
    """
    Read the short-term conversation memory for a session.
    Resets the 12-hour sliding TTL on each read.

    Returns `None` if no memory exists for that session.
    """
    client = get_client()
    key = key_session_memory(session_id)
    raw = client.hgetall(key)
    if not raw:
        return None

    # Reset sliding TTL
    client.expire(key, TTL_SESSION_MEMORY)

    turns_raw: list[dict[str, Any]] = json.loads(raw.get("turns", "[]"))
    return SessionMemory(
        session_id=raw["session_id"],
        persona_id=raw["persona_id"],
        user_id=raw["user_id"],
        turns=[ConversationTurn.model_validate(t) for t in turns_raw],
        turn_count=int(raw.get("turn_count", 0)),
        created_at=raw["created_at"],
        last_active=raw["last_active"],
    )


def append_session_turn(
    session_id: str,
    role: ConversationRole,
    content: str,
    agent_id: Optional[str] = None,
) -> None:
    """
    Append a new conversation turn to `session:{id}:memory`.

    Keeps only the last `MAX_MEMORY_TURNS` turns (sliding window).
    Resets the 12-hour sliding TTL on every write.

    Params:
        session_id: The session to update.
        role:       'user', 'assistant', or 'system'.
        content:    The message content.
        agent_id:   Optional persona ID (for assistant turns).
    """
    client = get_client()
    key = key_session_memory(session_id)
    raw = client.hgetall(key)

    now = datetime.now(timezone.utc).isoformat()
    existing: list[dict[str, Any]] = json.loads(raw.get("turns", "[]")) if raw else []

    new_turn = ConversationTurn(
        role=role,
        content=content,
        timestamp=now,
        agent_id=agent_id,
    )
    existing.append(new_turn.model_dump(exclude_none=True))

    # Keep only the last MAX_MEMORY_TURNS turns
    trimmed = existing[-MAX_MEMORY_TURNS:]
    turn_count = int(raw.get("turn_count", 0)) + 1 if raw else 1

    fields: dict[str, str] = {
        "turns": json.dumps(trimmed),
        "turn_count": str(turn_count),
        "last_active": now,
    }

    pipe = client.pipeline()
    pipe.hset(key, mapping=fields)
    pipe.expire(key, TTL_SESSION_MEMORY)
    pipe.execute()


# ---------------------------------------------------------------------------
# Convenience: full job lifecycle
# ---------------------------------------------------------------------------


def process_job(job: JobMessage, handler: Any) -> None:
    """
    Convenience wrapper that handles the full job lifecycle:
      1. Acquire lock → 2. Set RUNNING → 3. Execute handler →
      4. Set COMPLETED/FAILED → 5. Release lock.

    Params:
        job:     The `JobMessage` to process.
        handler: Callable(job) → result.  May raise on failure.
    """
    if not acquire_job_lock(job.job_id):
        publish_log(job.job_id, "Job already claimed by another worker", LogLevel.WARN)
        return

    try:
        update_status(job.job_id, JobStatus.RUNNING)
        publish_log(job.job_id, f"Starting job {job.job_id}", LogLevel.INFO)

        result = handler(job)

        update_status(job.job_id, JobStatus.COMPLETED, result=result)
        publish_log(job.job_id, f"Job {job.job_id} completed successfully", LogLevel.INFO)
    except Exception as exc:  # noqa: BLE001
        update_status(job.job_id, JobStatus.FAILED, error=str(exc))
        publish_log(
            job.job_id,
            f"Job {job.job_id} failed: {exc}",
            LogLevel.ERROR,
        )
        raise
    finally:
        release_job_lock(job.job_id)
