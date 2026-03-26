"""
Tests for main.py – Redis listener and job dispatcher helpers.

External services (Redis) are mocked to keep tests self-contained.
"""

from __future__ import annotations

import json
from unittest.mock import MagicMock, call, patch

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_redis():
    """Return a fully mocked redis.Redis client."""
    r = MagicMock()
    r.ping.return_value = True
    r.get.return_value = None
    r.set.return_value = True
    r.publish.return_value = 1
    return r


# ---------------------------------------------------------------------------
# _save_state / _load_state
# ---------------------------------------------------------------------------

class TestStateHelpers:
    def test_save_and_load_roundtrip(self):
        import main

        redis_stub = _make_redis()
        state = {"job_id": "abc", "status": "started"}
        main._save_state(redis_stub, "abc", state)

        # Simulate what Redis.get would return after the set call.
        redis_stub.get.return_value = json.dumps(state)
        loaded = main._load_state(redis_stub, "abc")
        assert loaded == state

    def test_load_missing_returns_empty_dict(self):
        import main

        redis_stub = _make_redis()
        redis_stub.get.return_value = None
        assert main._load_state(redis_stub, "missing") == {}


# ---------------------------------------------------------------------------
# _publish_log
# ---------------------------------------------------------------------------

class TestPublishLog:
    def test_publishes_valid_json(self):
        import main

        redis_stub = _make_redis()
        main._publish_log(redis_stub, "job-1", "SEO Specialist", "thinking", "checking keywords")

        redis_stub.publish.assert_called_once()
        channel, payload = redis_stub.publish.call_args.args
        assert channel == main.LOG_CHANNEL
        data = json.loads(payload)
        assert data["job_id"] == "job-1"
        assert data["agent"] == "SEO Specialist"
        assert data["status"] == "thinking"
        assert "checking keywords" in data["data"]

    def test_long_data_is_published_intact(self):
        import main

        redis_stub = _make_redis()
        long_data = "x" * 5000
        main._publish_log(redis_stub, "j", "Agent", "done", long_data)
        _, payload = redis_stub.publish.call_args.args
        assert json.loads(payload)["data"] == long_data


# ---------------------------------------------------------------------------
# _dispatch_job – error handling
# ---------------------------------------------------------------------------

class TestDispatchJob:
    def test_missing_persona_publishes_error(self):
        import main

        redis_stub = _make_redis()
        job = {"job_id": "job-err", "persona_id": "nonexistent_xyz", "task": "do something"}

        main._dispatch_job(redis_stub, job)

        calls = [c.args[1] for c in redis_stub.publish.call_args_list]
        statuses = [json.loads(c)["status"] for c in calls]
        assert "error" in statuses

    def test_successful_mock_job_publishes_done(self):
        """With crewai mocked away the worker should still emit a 'done' log."""
        import main

        redis_stub = _make_redis()
        job = {
            "job_id": "job-ok",
            "persona_id": "writer",
            "task": "Write a blog post about AI.",
            "framework": "crewai",
        }

        mock_agent = MagicMock()
        mock_crew = MagicMock()
        mock_crew.kickoff.return_value = "Draft blog post content."
        mock_task = MagicMock()

        fake_crewai = MagicMock()
        fake_crewai.Agent.return_value = mock_agent
        fake_crewai.Crew.return_value = mock_crew
        fake_crewai.Task.return_value = mock_task

        # Patch workspace_write so no disk access is needed.
        with patch("main.tool_write", return_value="ok"), \
             patch.dict("sys.modules", {"crewai": fake_crewai}):
            main._dispatch_job(redis_stub, job)

        calls = [json.loads(c.args[1]) for c in redis_stub.publish.call_args_list]
        statuses = [c["status"] for c in calls]
        assert "done" in statuses

    def test_dispatch_saves_state_to_redis(self):
        import main

        redis_stub = _make_redis()
        job = {
            "job_id": "job-state",
            "persona_id": "editor",
            "task": "Edit the document.",
            "framework": "crewai",
        }

        with patch("main.tool_write", return_value="ok"):
            main._dispatch_job(redis_stub, job)

        # _save_state calls redis.set; verify it was called at least twice
        # (once at start, once at end).
        assert redis_stub.set.call_count >= 2
