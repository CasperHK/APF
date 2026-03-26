"""
tests/test_workspace_manager.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Unit tests for the WorkspaceManager utility.

Run with:
    python -m pytest src/agent-worker/tests/test_workspace_manager.py -v
"""

from __future__ import annotations

import json
import os
import sys
import time

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from workspace_manager import WorkspaceManager, WorkspaceInfo


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def wm(tmp_path):
    return WorkspaceManager(base_path=str(tmp_path))


@pytest.fixture()
def wm_with_template(tmp_path):
    """WorkspaceManager that has a template directory."""
    template = tmp_path / "template"
    template.mkdir()
    (template / "input").mkdir()
    (template / "output").mkdir()
    (template / "tmp").mkdir()
    (template / "README.md").write_text("# Workspace\n")
    # .gitkeep files should NOT be copied
    (template / "input" / ".gitkeep").touch()

    base = tmp_path / "workspaces"
    return WorkspaceManager(base_path=str(base), template_path=str(template))


# ---------------------------------------------------------------------------
# init_workspace
# ---------------------------------------------------------------------------

class TestInitWorkspace:
    def test_creates_workspace_directory(self, wm):
        info = wm.init_workspace("proj-001")
        assert os.path.isdir(info.root)

    def test_returns_workspace_info(self, wm):
        info = wm.init_workspace("proj-002")
        assert isinstance(info, WorkspaceInfo)
        assert info.project_id == "proj-002"

    def test_creates_standard_subdirs(self, wm):
        info = wm.init_workspace("proj-003")
        root = wm.base_path / "proj-003"
        for sub in ("input", "output", "tmp"):
            assert (root / sub).is_dir(), f"Missing sub-directory: {sub}"

    def test_idempotent_init(self, wm):
        info1 = wm.init_workspace("proj-idem")
        wm.init_workspace("proj-idem")          # second call should not raise
        info2 = wm.get_workspace("proj-idem")
        assert info1.created_at == info2.created_at

    def test_tags_stored(self, wm):
        info = wm.init_workspace("proj-tags", tags={"env": "test"})
        assert info.tags == {"env": "test"}

    def test_custom_quota(self, wm):
        info = wm.init_workspace("proj-quota", quota_bytes=512 * 1024 * 1024)
        assert info.quota_bytes == 512 * 1024 * 1024

    def test_template_files_copied(self, wm_with_template):
        info = wm_with_template.init_workspace("proj-tmpl")
        root = wm_with_template.base_path / "proj-tmpl"
        assert (root / "README.md").exists()
        assert (root / "input").is_dir()

    def test_gitkeep_not_copied(self, wm_with_template):
        wm_with_template.init_workspace("proj-gitkeep")
        root = wm_with_template.base_path / "proj-gitkeep"
        assert not (root / "input" / ".gitkeep").exists()

    def test_invalid_project_id_raises(self, wm):
        with pytest.raises(ValueError):
            wm.init_workspace("")

    def test_traversal_project_id_raises(self, wm):
        with pytest.raises(ValueError):
            wm.init_workspace("../escape")


# ---------------------------------------------------------------------------
# get_workspace
# ---------------------------------------------------------------------------

class TestGetWorkspace:
    def test_returns_info_for_existing(self, wm):
        wm.init_workspace("proj-get")
        info = wm.get_workspace("proj-get")
        assert info.project_id == "proj-get"

    def test_raises_for_missing(self, wm):
        with pytest.raises(FileNotFoundError):
            wm.get_workspace("nonexistent")


# ---------------------------------------------------------------------------
# list_workspaces
# ---------------------------------------------------------------------------

class TestListWorkspaces:
    def test_empty_initially(self, wm):
        assert wm.list_workspaces() == []

    def test_lists_all(self, wm):
        wm.init_workspace("p1")
        wm.init_workspace("p2")
        ids = {w.project_id for w in wm.list_workspaces()}
        assert ids == {"p1", "p2"}


# ---------------------------------------------------------------------------
# delete_workspace
# ---------------------------------------------------------------------------

class TestDeleteWorkspace:
    def test_deletes_directory(self, wm):
        wm.init_workspace("proj-del")
        wm.delete_workspace("proj-del")
        assert not (wm.base_path / "proj-del").exists()

    def test_delete_nonexistent_is_noop(self, wm):
        wm.delete_workspace("no-such-project")  # must not raise


# ---------------------------------------------------------------------------
# get_disk_usage
# ---------------------------------------------------------------------------

class TestDiskUsage:
    def test_empty_workspace_usage(self, wm):
        wm.init_workspace("proj-disk")
        used = wm.get_disk_usage("proj-disk")
        # Metadata file exists, so usage > 0
        assert used > 0

    def test_usage_increases_after_write(self, wm):
        wm.init_workspace("proj-disk2")
        before = wm.get_disk_usage("proj-disk2")
        # Write a 1 KB file
        (wm.base_path / "proj-disk2" / "test.bin").write_bytes(b"x" * 1024)
        after = wm.get_disk_usage("proj-disk2")
        assert after > before

    def test_raises_for_missing(self, wm):
        with pytest.raises(FileNotFoundError):
            wm.get_disk_usage("ghost")


# ---------------------------------------------------------------------------
# check_quota
# ---------------------------------------------------------------------------

class TestCheckQuota:
    def test_not_over_quota_initially(self, wm):
        wm.init_workspace("proj-quota-check")
        used, quota, over = wm.check_quota("proj-quota-check")
        assert not over
        assert used < quota

    def test_over_quota_when_usage_exceeds(self, wm):
        wm.init_workspace("proj-over", quota_bytes=1)
        (wm.base_path / "proj-over" / "big.bin").write_bytes(b"x" * 100)
        used, quota, over = wm.check_quota("proj-over")
        assert over


# ---------------------------------------------------------------------------
# cleanup_tmp
# ---------------------------------------------------------------------------

class TestCleanupTmp:
    def test_removes_files_in_tmp(self, wm):
        wm.init_workspace("proj-ctmp")
        tmp = wm.base_path / "proj-ctmp" / "tmp"
        (tmp / "a.txt").write_text("hello")
        (tmp / "b.log").write_text("world")
        count = wm.cleanup_tmp("proj-ctmp")
        assert count == 2
        assert list(tmp.iterdir()) == []

    def test_no_tmp_dir_returns_zero(self, wm):
        wm.init_workspace("proj-notmp")
        (wm.base_path / "proj-notmp" / "tmp").rmdir()
        assert wm.cleanup_tmp("proj-notmp") == 0


# ---------------------------------------------------------------------------
# cleanup_output
# ---------------------------------------------------------------------------

class TestCleanupOutput:
    def test_removes_files_in_output(self, wm):
        wm.init_workspace("proj-cout")
        out = wm.base_path / "proj-cout" / "output"
        (out / "result.csv").write_text("a,b,c")
        count = wm.cleanup_output("proj-cout")
        assert count == 1
        assert list(out.iterdir()) == []


# ---------------------------------------------------------------------------
# purge_stale_workspaces
# ---------------------------------------------------------------------------

class TestPurgeStale:
    def test_purges_old_workspace(self, wm, tmp_path):
        wm.init_workspace("proj-stale")
        # Manually back-date the metadata
        meta_path = wm.base_path / "proj-stale" / WorkspaceManager.METADATA_FILE
        meta = json.loads(meta_path.read_text())
        # Set last_accessed to far in the past
        meta["last_accessed"] = "2000-01-01T00:00:00+00:00"
        meta_path.write_text(json.dumps(meta))

        deleted = wm.purge_stale_workspaces(max_age_seconds=1)
        assert "proj-stale" in deleted
        assert not (wm.base_path / "proj-stale").exists()

    def test_does_not_purge_recent(self, wm):
        wm.init_workspace("proj-fresh")
        deleted = wm.purge_stale_workspaces(max_age_seconds=3600)
        assert "proj-fresh" not in deleted
