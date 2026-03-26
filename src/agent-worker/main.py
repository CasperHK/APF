"""
APF Agent Worker — Python / CrewAI entry point.

This container:
- Subscribes to Redis Pub/Sub channels for task requests from the APF API
- Executes CrewAI / LangGraph multi-agent workflows
- Writes outputs to /secure_workspace (shared Docker volume)
- Publishes real-time logs back via Redis → WebSocket bridge in the APF server

Architecture:
  APF API (Elysia/Bun) → Redis Pub/Sub → Agent Worker (Python/CrewAI)
                        ← Redis Pub/Sub ← (logs + results)
"""

import asyncio
import logging
import os

import redis.asyncio as aioredis

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
WORKSPACE = os.getenv("WORKSPACE_PATH", "/secure_workspace")

TASK_CHANNEL = "apf:tasks"
LOG_CHANNEL = "apf:logs"


async def handle_task(redis_client: aioredis.Redis, payload: str) -> None:
    """Process a single task request from the API server."""
    import json

    try:
        task = json.loads(payload)
        task_id = task.get("task_id", "unknown")
        agent_id = task.get("agent_id", "unknown")
        prompt = task.get("prompt", "")

        log.info("Received task %s for agent %s", task_id, agent_id)

        # Publish thinking status
        await redis_client.publish(
            LOG_CHANNEL,
            json.dumps({
                "task_id": task_id,
                "agent_id": agent_id,
                "type": "log",
                "content": f"[{agent_id}] Starting task: {prompt[:80]}…",
            }),
        )

        # TODO: instantiate CrewAI crew here with the agent persona
        # crew = build_crew(agent_id, prompt)
        # result = crew.kickoff()

        # Stub: write a placeholder result to the workspace
        output_path = os.path.join(WORKSPACE, f"output_{task_id}.md")
        with open(output_path, "w") as f:
            f.write(f"# Task Output\n\n**Agent:** {agent_id}\n**Prompt:** {prompt}\n\n_CrewAI integration pending._\n")

        await redis_client.publish(
            LOG_CHANNEL,
            json.dumps({
                "task_id": task_id,
                "agent_id": agent_id,
                "type": "result",
                "content": f"Task complete. Output saved to {output_path}",
            }),
        )

    except Exception as exc:
        log.exception("Error handling task: %s", exc)


async def main() -> None:
    log.info("APF Agent Worker starting…")
    log.info("Redis: %s | Workspace: %s", REDIS_URL, WORKSPACE)

    os.makedirs(WORKSPACE, exist_ok=True)

    redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(TASK_CHANNEL)

    log.info("Subscribed to channel '%s'. Waiting for tasks…", TASK_CHANNEL)

    async for message in pubsub.listen():
        if message["type"] == "message":
            asyncio.create_task(handle_task(redis_client, message["data"]))


if __name__ == "__main__":
    asyncio.run(main())
APF Agent-Worker entry point.

Listens on the Redis Pub/Sub channel ``apf:jobs`` for JSON job requests
from the Bun/Elysia API server, dispatches them to a CrewAI or LangGraph
agent, and streams real-time thinking logs back via the
``apf:agent_logs`` channel.

Expected incoming message format
---------------------------------
{
  "job_id":    "uuid-v4",
  "persona_id": "seo_specialist",
  "task":       "Research top keywords for AI agents SaaS product.",
  "framework":  "crewai",          // optional, default "crewai"
  "workspace":  "project-42"       // optional sub-folder in /app/workspace
}

Outgoing log message format
----------------------------
{
  "job_id": "uuid-v4",
  "agent":  "SEO Specialist",
  "status": "thinking" | "searching" | "writing" | "done" | "error",
  "data":   "<message or result>"
}
"""

from __future__ import annotations

import json
import logging
import os
import signal
import sys
import time
import traceback
from typing import Any, Dict

import redis as redis_module

from agents.factory import create_agent, create_crew, resolve_persona
from tools.workspace_tools import tool_read, tool_write, tool_list

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("apf.worker")

# ---------------------------------------------------------------------------
# Configuration (all tunable via environment variables)
# ---------------------------------------------------------------------------
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
JOB_CHANNEL = os.environ.get("APF_JOB_CHANNEL", "apf:jobs")
LOG_CHANNEL = os.environ.get("APF_LOG_CHANNEL", "apf:agent_logs")
STATE_KEY_PREFIX = os.environ.get("APF_STATE_KEY_PREFIX", "apf:state:")
WORKSPACE_DIR = os.environ.get("WORKSPACE_DIR", "/app/workspace")

# ---------------------------------------------------------------------------
# Redis clients
# ---------------------------------------------------------------------------

def _connect_redis(url: str, max_retries: int = 10, retry_delay: float = 2.0) -> redis_module.Redis:
    """Return a connected Redis client, retrying on connection failure."""
    for attempt in range(1, max_retries + 1):
        try:
            client = redis_module.from_url(url, decode_responses=True)
            client.ping()
            logger.info("Connected to Redis at %s (attempt %d)", url, attempt)
            return client
        except redis_module.exceptions.ConnectionError as exc:
            if attempt == max_retries:
                raise RuntimeError(
                    f"Cannot connect to Redis after {max_retries} attempts: {exc}"
                ) from exc
            logger.warning(
                "Redis not ready (attempt %d/%d). Retrying in %.1fs…",
                attempt, max_retries, retry_delay,
            )
            time.sleep(retry_delay)


# ---------------------------------------------------------------------------
# State synchronisation helpers
# ---------------------------------------------------------------------------

def _save_state(redis_client: redis_module.Redis, job_id: str, state: Dict[str, Any]) -> None:
    """Persist *state* dict to Redis under ``apf:state:<job_id>``."""
    key = f"{STATE_KEY_PREFIX}{job_id}"
    redis_client.set(key, json.dumps(state), ex=3600)  # TTL: 1 hour


def _load_state(redis_client: redis_module.Redis, job_id: str) -> Dict[str, Any]:
    """Load and return the state dict for *job_id*, or ``{}`` if absent."""
    key = f"{STATE_KEY_PREFIX}{job_id}"
    raw = redis_client.get(key)
    return json.loads(raw) if raw else {}


# ---------------------------------------------------------------------------
# Log publisher
# ---------------------------------------------------------------------------

def _publish_log(
    redis_client: redis_module.Redis,
    job_id: str,
    agent_name: str,
    status: str,
    data: str,
) -> None:
    """Publish a structured agent log message to ``apf:agent_logs``."""
    message = json.dumps(
        {"job_id": job_id, "agent": agent_name, "status": status, "data": data}
    )
    redis_client.publish(LOG_CHANNEL, message)
    logger.info("Published log [%s/%s]: %s", job_id, status, data[:120])


# ---------------------------------------------------------------------------
# Job dispatcher
# ---------------------------------------------------------------------------

def _dispatch_job(redis_client: redis_module.Redis, job: Dict[str, Any]) -> None:
    """Process a single job dict received from the Redis listener.

    This function:
    1. Resolves the persona.
    2. Creates the appropriate agent (CrewAI or LangGraph).
    3. Streams thinking logs back over Redis Pub/Sub.
    4. Writes the final result to the workspace.
    5. Persists final state in Redis.
    """
    job_id = job.get("job_id", "unknown")
    persona_id = job.get("persona_id", "writer")
    task_description = job.get("task", "")
    framework = job.get("framework", "crewai").lower()
    workspace_sub = job.get("workspace", "")

    # Save initial state.
    state: Dict[str, Any] = {
        "job_id": job_id,
        "persona_id": persona_id,
        "status": "started",
        "task": task_description,
    }
    _save_state(redis_client, job_id, state)

    try:
        # ------------------------------------------------------------------
        # Resolve persona so we can use the human-readable role name.
        # ------------------------------------------------------------------
        persona = resolve_persona(persona_id, redis_client)
        agent_name = persona["role"]

        _publish_log(redis_client, job_id, agent_name, "thinking",
                     f"Loading persona '{persona_id}'…")

        # ------------------------------------------------------------------
        # Build workspace-aware tools.
        # ------------------------------------------------------------------
        if workspace_sub:
            sub = workspace_sub.rstrip("/") + "/"
            workspace_tools = [
                lambda p, s=sub: tool_read(s + p),
                lambda p, c, s=sub: tool_write(s + p, c),
                lambda s=sub: tool_list(s),
            ]
        else:
            workspace_tools = [tool_read, tool_write, tool_list]

        # ------------------------------------------------------------------
        # CrewAI path – role-based delegation for standard tasks.
        # ------------------------------------------------------------------
        if framework == "crewai":
            _publish_log(redis_client, job_id, agent_name, "searching",
                         f"Assembling CrewAI agent for task: {task_description!r}")

            agent = create_agent(
                persona_id,
                framework="crewai",
                tools=workspace_tools,
                redis_client=redis_client,
            )

            # CrewAI's kickoff is synchronous; we wrap it with progress logs.
            _publish_log(redis_client, job_id, agent_name, "working",
                         "Agent is processing the task…")

            try:
                from crewai import Crew, Task  # type: ignore

                task_obj = Task(
                    description=task_description,
                    agent=agent,
                    expected_output="A detailed, high-quality response.",
                )
                crew = Crew(agents=[agent], tasks=[task_obj], verbose=False)
                result = crew.kickoff()
                result_text = str(result)
            except ImportError:
                # crewai not available; emit a structured placeholder.
                result_text = (
                    f"[MOCK] {agent_name} completed task: {task_description}"
                )

        # ------------------------------------------------------------------
        # LangGraph path – complex iterative / human-in-the-loop cycles.
        # ------------------------------------------------------------------
        elif framework == "langgraph":
            _publish_log(redis_client, job_id, agent_name, "searching",
                         f"Building LangGraph state machine for: {task_description!r}")

            graph = create_agent(
                persona_id,
                framework="langgraph",
                tools=workspace_tools,
                redis_client=redis_client,
            )

            initial_state = {
                "persona": persona,
                "task": task_description,
                "thoughts": "",
                "output": "",
                "human_feedback": "",
                "iteration": 0,
            }

            _publish_log(redis_client, job_id, agent_name, "working",
                         "LangGraph state machine is running…")

            final_state = graph.invoke(initial_state)
            result_text = final_state.get("output", "(no output)")

            # Stream intermediate thoughts as logs.
            if final_state.get("thoughts"):
                _publish_log(redis_client, job_id, agent_name, "thinking",
                             final_state["thoughts"])
        else:
            raise ValueError(f"Unsupported framework: '{framework}'")

        # ------------------------------------------------------------------
        # Write result to workspace.
        # ------------------------------------------------------------------
        output_path = f"{workspace_sub}/{job_id}_result.md" if workspace_sub else f"{job_id}_result.md"
        output_path = output_path.lstrip("/")
        try:
            tool_write(output_path, f"# Result\n\n{result_text}\n", )
            _publish_log(redis_client, job_id, agent_name, "writing",
                         f"Result written to workspace/{output_path}")
        except Exception as write_exc:
            logger.warning("Could not write result to workspace: %s", write_exc)

        # ------------------------------------------------------------------
        # Final success log + state update.
        # ------------------------------------------------------------------
        _publish_log(redis_client, job_id, agent_name, "done", result_text[:2000])
        state.update({"status": "done", "result": result_text})

    except Exception as exc:
        tb = traceback.format_exc()
        logger.error("Job %s failed: %s\n%s", job_id, exc, tb)
        agent_name = job.get("persona_id", "agent")
        _publish_log(redis_client, job_id, agent_name, "error", str(exc))
        state.update({"status": "error", "error": str(exc)})

    finally:
        _save_state(redis_client, job_id, state)


# ---------------------------------------------------------------------------
# Redis Pub/Sub listener
# ---------------------------------------------------------------------------

def run_listener(redis_client: redis_module.Redis) -> None:
    """Subscribe to *JOB_CHANNEL* and dispatch incoming jobs forever.

    This is the main event loop.  It calls :func:`_dispatch_job` for every
    valid JSON message received on the channel.
    """
    pubsub = redis_client.pubsub(ignore_subscribe_messages=True)
    pubsub.subscribe(JOB_CHANNEL)
    logger.info("Subscribed to Redis channel '%s'. Waiting for jobs…", JOB_CHANNEL)

    for message in pubsub.listen():
        if message is None:
            continue
        if message.get("type") != "message":
            continue

        raw = message.get("data", "")
        logger.debug("Received raw message: %s", raw[:200])

        try:
            job = json.loads(raw)
        except json.JSONDecodeError as exc:
            logger.error("Malformed JSON in job message: %s – %s", exc, raw[:200])
            continue

        if not isinstance(job, dict):
            logger.error("Job payload must be a JSON object. Got: %r", type(job))
            continue

        if not job.get("job_id"):
            logger.warning("Job missing 'job_id', skipping: %s", job)
            continue

        logger.info(
            "Dispatching job '%s' (persona=%s, framework=%s)",
            job.get("job_id"), job.get("persona_id"), job.get("framework", "crewai"),
        )
        _dispatch_job(redis_client, job)


# ---------------------------------------------------------------------------
# Graceful shutdown
# ---------------------------------------------------------------------------

_shutdown_requested = False


def _handle_signal(sig: int, _frame: Any) -> None:  # pragma: no cover
    global _shutdown_requested
    logger.info("Received signal %d – shutting down gracefully…", sig)
    _shutdown_requested = True


signal.signal(signal.SIGTERM, _handle_signal)
signal.signal(signal.SIGINT, _handle_signal)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    """Connect to Redis and start the job listener loop."""
    logger.info("APF Agent-Worker starting…")
    logger.info("  Redis URL : %s", REDIS_URL)
    logger.info("  Job channel: %s", JOB_CHANNEL)
    logger.info("  Log channel: %s", LOG_CHANNEL)
    logger.info("  Workspace  : %s", WORKSPACE_DIR)

    # Ensure workspace directory exists.
    os.makedirs(WORKSPACE_DIR, exist_ok=True)

    redis_client = _connect_redis(REDIS_URL)
    run_listener(redis_client)


if __name__ == "__main__":
    main()
