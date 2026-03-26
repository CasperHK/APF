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
