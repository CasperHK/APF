"""
Tests for agents/factory.py

These tests mock the optional crewai / langgraph imports so they run
without those heavy libraries installed.
"""

from __future__ import annotations

import json
from types import ModuleType
from unittest.mock import MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_redis_stub(persona_data: dict | None = None):
    """Return a mock Redis client.  If *persona_data* is given, .get() returns it."""
    stub = MagicMock()
    stub.get.return_value = json.dumps(persona_data) if persona_data else None
    return stub


# ---------------------------------------------------------------------------
# resolve_persona
# ---------------------------------------------------------------------------

class TestResolvePersona:
    def test_builtin_seo_specialist(self):
        from agents.factory import resolve_persona

        p = resolve_persona("seo_specialist")
        assert p["role"] == "SEO Specialist"

    def test_builtin_writer(self):
        from agents.factory import resolve_persona

        p = resolve_persona("writer")
        assert "Writer" in p["role"]

    def test_builtin_editor(self):
        from agents.factory import resolve_persona

        p = resolve_persona("editor")
        assert "Editor" in p["role"]

    def test_redis_persona_overrides_builtin(self):
        from agents.factory import resolve_persona

        custom = {
            "role": "Custom Agent",
            "goal": "Do custom things.",
            "backstory": "A custom agent built for testing.",
        }
        redis_stub = _make_redis_stub(custom)
        p = resolve_persona("seo_specialist", redis_client=redis_stub)
        assert p["role"] == "Custom Agent"

    def test_unknown_persona_raises_key_error(self):
        from agents.factory import resolve_persona

        with pytest.raises(KeyError, match="not found"):
            resolve_persona("nonexistent_persona_xyz")

    def test_redis_unavailable_falls_back_to_builtin(self):
        from agents.factory import resolve_persona

        redis_stub = _make_redis_stub(None)
        p = resolve_persona("writer", redis_client=redis_stub)
        assert p["role"] == "Creative Writer"


# ---------------------------------------------------------------------------
# create_agent – crewai path (mocked)
# ---------------------------------------------------------------------------

class TestCreateAgentCrewAI:
    def test_create_returns_agent(self):
        """create_agent('seo_specialist') should return a crewai.Agent."""
        mock_agent = MagicMock(name="MockAgent")
        mock_agent_cls = MagicMock(return_value=mock_agent)

        fake_crewai = ModuleType("crewai")
        fake_crewai.Agent = mock_agent_cls  # type: ignore
        fake_crewai.Crew = MagicMock()
        fake_crewai.Task = MagicMock()

        with patch.dict("sys.modules", {"crewai": fake_crewai}):
            from importlib import reload
            import agents.factory as factory_module
            reload(factory_module)

            agent = factory_module.create_agent("seo_specialist", framework="crewai")

        mock_agent_cls.assert_called_once()
        call_kwargs = mock_agent_cls.call_args.kwargs
        assert call_kwargs["role"] == "SEO Specialist"

    def test_missing_crewai_raises_import_error(self):
        from agents.factory import _build_crewai_agent, DEFAULT_PERSONAS

        with patch.dict("sys.modules", {"crewai": None}):
            with pytest.raises(ImportError, match="crewai"):
                _build_crewai_agent(DEFAULT_PERSONAS["writer"])


# ---------------------------------------------------------------------------
# create_agent – langgraph path (mocked)
# ---------------------------------------------------------------------------

class TestCreateAgentLangGraph:
    def _make_fake_langgraph(self):
        """Build minimal fake langgraph module."""
        # StateGraph stub
        class FakeStateGraph:
            def __init__(self, schema):
                self._nodes = {}

            def add_node(self, name, fn):
                self._nodes[name] = fn

            def set_entry_point(self, name):
                pass

            def add_edge(self, a, b):
                pass

            def add_conditional_edges(self, src, fn, mapping):
                pass

            def compile(self):
                return MagicMock(name="CompiledGraph")

        fake_lg = ModuleType("langgraph")
        fake_graph = ModuleType("langgraph.graph")
        fake_graph.StateGraph = FakeStateGraph  # type: ignore
        fake_graph.END = "__end__"  # type: ignore

        return fake_lg, fake_graph

    def test_create_returns_compiled_graph(self):
        fake_lg, fake_graph = self._make_fake_langgraph()

        with patch.dict(
            "sys.modules",
            {"langgraph": fake_lg, "langgraph.graph": fake_graph},
        ):
            from importlib import reload
            import agents.factory as factory_module
            reload(factory_module)

            result = factory_module.create_agent("seo_specialist", framework="langgraph")
        # compile() returns a MagicMock; just assert something was returned.
        assert result is not None

    def test_missing_langgraph_raises_import_error(self):
        from agents.factory import _build_langgraph, DEFAULT_PERSONAS

        with patch.dict("sys.modules", {"langgraph": None, "langgraph.graph": None}):
            with pytest.raises(ImportError, match="langgraph"):
                _build_langgraph(DEFAULT_PERSONAS["writer"])


# ---------------------------------------------------------------------------
# create_agent – unknown framework
# ---------------------------------------------------------------------------

def test_unknown_framework_raises_value_error():
    from agents.factory import create_agent

    with pytest.raises(ValueError, match="Unknown framework"):
        create_agent("writer", framework="tensorflow")
