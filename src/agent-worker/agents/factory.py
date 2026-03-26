"""
Dynamic Agent Factory for APF agent-worker.

Creates CrewAI Agents and LangGraph state-machine graphs based on Persona
templates fetched from Redis or a fallback in-memory registry.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, Optional

import redis as redis_module

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Redis connection (shared with main.py)
# ---------------------------------------------------------------------------
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

# ---------------------------------------------------------------------------
# Built-in persona templates (fallback when DB / Redis lookup fails).
# Keys are persona IDs; values are dicts consumed by _build_crewai_agent().
# ---------------------------------------------------------------------------
DEFAULT_PERSONAS: Dict[str, Dict[str, Any]] = {
    "seo_specialist": {
        "role": "SEO Specialist",
        "goal": (
            "Analyse target keywords, research SERP trends, and recommend "
            "data-driven optimisation strategies to maximise organic reach."
        ),
        "backstory": (
            "A seasoned SEO expert who has driven triple-digit traffic growth "
            "for SaaS startups.  Obsessed with search-intent alignment and "
            "Core Web Vitals."
        ),
        "verbose": True,
        "allow_delegation": False,
    },
    "writer": {
        "role": "Creative Writer",
        "goal": (
            "Craft compelling, on-brand long-form content that balances SEO "
            "requirements with genuine reader value."
        ),
        "backstory": (
            "A former journalist and brand storyteller who believes every "
            "great piece of content starts with a human insight."
        ),
        "verbose": True,
        "allow_delegation": False,
    },
    "editor": {
        "role": "Senior Editor",
        "goal": (
            "Elevate drafts to publication-ready quality by refining tone, "
            "structure, factual accuracy, and stylistic consistency."
        ),
        "backstory": (
            "A meticulous editor with 10 years of experience at top-tier "
            "publications, known for transforming 'good enough' into 'great'."
        ),
        "verbose": True,
        "allow_delegation": False,
    },
}


# ---------------------------------------------------------------------------
# Persona resolution
# ---------------------------------------------------------------------------

def _fetch_persona_from_redis(
    persona_id: str,
    redis_client: Optional[redis_module.Redis],
) -> Optional[Dict[str, Any]]:
    """Attempt to load a persona definition from Redis.

    Personas are stored under the key ``persona:<persona_id>`` as a JSON string.
    Returns ``None`` if the key is absent or Redis is unavailable.
    """
    if redis_client is None:
        return None
    try:
        raw = redis_client.get(f"persona:{persona_id}")
        if raw:
            data = json.loads(raw)
            logger.info("Loaded persona '%s' from Redis.", persona_id)
            return data
    except Exception as exc:  # pragma: no cover – network-level failure
        logger.warning("Redis persona fetch failed for '%s': %s", persona_id, exc)
    return None


def resolve_persona(
    persona_id: str,
    redis_client: Optional[redis_module.Redis] = None,
) -> Dict[str, Any]:
    """Return the persona definition dict for *persona_id*.

    Lookup order:
    1. Redis key ``persona:<persona_id>``
    2. Built-in :data:`DEFAULT_PERSONAS` registry

    Raises
    ------
    KeyError
        When the persona is not found in either source.
    """
    # 1. Redis
    persona = _fetch_persona_from_redis(persona_id, redis_client)
    if persona:
        return persona

    # 2. Built-in registry
    if persona_id in DEFAULT_PERSONAS:
        logger.info("Using built-in persona template for '%s'.", persona_id)
        return DEFAULT_PERSONAS[persona_id]

    raise KeyError(
        f"Persona '{persona_id}' not found in Redis or the built-in registry. "
        f"Available built-ins: {list(DEFAULT_PERSONAS.keys())}"
    )


# ---------------------------------------------------------------------------
# CrewAI agent builder
# ---------------------------------------------------------------------------

def _build_crewai_agent(persona: Dict[str, Any], tools: list | None = None):
    """Instantiate a :class:`crewai.Agent` from a persona definition dict.

    Parameters
    ----------
    persona:
        A dict with at least ``role``, ``goal``, and ``backstory`` keys.
    tools:
        Optional list of tool callables to attach to the agent.

    Returns
    -------
    crewai.Agent
    """
    try:
        from crewai import Agent  # type: ignore
    except ImportError as exc:
        raise ImportError(
            "crewai is not installed.  Add it to requirements.txt."
        ) from exc

    return Agent(
        role=persona["role"],
        goal=persona["goal"],
        backstory=persona["backstory"],
        tools=tools or [],
        verbose=persona.get("verbose", True),
        allow_delegation=persona.get("allow_delegation", False),
    )


# ---------------------------------------------------------------------------
# LangGraph graph builder
# ---------------------------------------------------------------------------

def _build_langgraph(persona: Dict[str, Any], tools: list | None = None):
    """Build a minimal LangGraph :class:`~langgraph.graph.StateGraph` for the
    given *persona*.

    The graph models a simple human-in-the-loop cycle::

        [think] --> [act] --> [review]
                        ^          |
                        |__ human _|

    Parameters
    ----------
    persona:
        Persona definition dict.
    tools:
        Optional list of tool callables.

    Returns
    -------
    A compiled LangGraph ``CompiledGraph``.
    """
    try:
        from langgraph.graph import StateGraph, END  # type: ignore
        from typing import TypedDict
    except ImportError as exc:
        raise ImportError(
            "langgraph is not installed.  Add it to requirements.txt."
        ) from exc

    class AgentState(TypedDict):
        persona: Dict[str, Any]
        task: str
        thoughts: str
        output: str
        human_feedback: str
        iteration: int

    def think_node(state: AgentState) -> AgentState:
        logger.info("[%s] think_node – iteration %d", persona["role"], state["iteration"])
        # In production this would invoke an LLM.  Here we emit a structured
        # log entry so the caller can stream it back over Redis.
        state["thoughts"] = (
            f"[{persona['role']}] Analysing task: {state['task']!r}  "
            f"(iteration {state['iteration']})"
        )
        return state

    def act_node(state: AgentState) -> AgentState:
        logger.info("[%s] act_node", persona["role"])
        state["output"] = (
            f"[{persona['role']}] Draft output based on thoughts: "
            f"{state['thoughts']}"
        )
        return state

    def review_node(state: AgentState) -> AgentState:
        logger.info("[%s] review_node", persona["role"])
        state["iteration"] += 1
        return state

    def should_continue(state: AgentState) -> str:
        """Route back to 'think' if human feedback is pending, else END."""
        if state.get("human_feedback"):
            state["human_feedback"] = ""  # consume feedback
            return "think"
        return END

    graph = StateGraph(AgentState)
    graph.add_node("think", think_node)
    graph.add_node("act", act_node)
    graph.add_node("review", review_node)

    graph.set_entry_point("think")
    graph.add_edge("think", "act")
    graph.add_edge("act", "review")
    graph.add_conditional_edges("review", should_continue, {"think": "think", END: END})

    return graph.compile()


# ---------------------------------------------------------------------------
# Public factory API
# ---------------------------------------------------------------------------

def create_agent(
    persona_id: str,
    framework: str = "crewai",
    tools: list | None = None,
    redis_client: Optional[redis_module.Redis] = None,
):
    """Create an agent for *persona_id* using the specified *framework*.

    Parameters
    ----------
    persona_id:
        Identifier for the persona (e.g. ``"seo_specialist"``).
    framework:
        ``"crewai"`` (default) or ``"langgraph"``.
    tools:
        Tool callables to attach to the agent.
    redis_client:
        Optional connected :class:`redis.Redis` instance used to fetch custom
        persona definitions stored in the database.

    Returns
    -------
    crewai.Agent | CompiledGraph
        The instantiated agent object.
    """
    persona = resolve_persona(persona_id, redis_client)

    if framework == "crewai":
        return _build_crewai_agent(persona, tools)
    if framework == "langgraph":
        return _build_langgraph(persona, tools)

    raise ValueError(
        f"Unknown framework '{framework}'. Supported values: 'crewai', 'langgraph'."
    )


def create_crew(
    persona_ids: list[str],
    task_description: str,
    tools: list | None = None,
    redis_client: Optional[redis_module.Redis] = None,
):
    """Assemble a :class:`crewai.Crew` from multiple persona IDs.

    Parameters
    ----------
    persona_ids:
        Ordered list of persona identifiers.
    task_description:
        Plain-text description of the overall job.
    tools:
        Shared tools available to all agents.
    redis_client:
        Optional Redis client for persona resolution.

    Returns
    -------
    crewai.Crew
    """
    try:
        from crewai import Crew, Task  # type: ignore
    except ImportError as exc:
        raise ImportError(
            "crewai is not installed.  Add it to requirements.txt."
        ) from exc

    agents = [
        _build_crewai_agent(resolve_persona(pid, redis_client), tools)
        for pid in persona_ids
    ]

    tasks = [
        Task(
            description=f"[{agents[i].role}] {task_description}",
            agent=agents[i],
            expected_output="A detailed, high-quality response.",
        )
        for i in range(len(agents))
    ]

    return Crew(agents=agents, tasks=tasks, verbose=True)
