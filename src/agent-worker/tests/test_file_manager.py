"""
tests/test_file_manager.py
~~~~~~~~~~~~~~~~~~~~~~~~~~
Unit tests for the FileManager path-traversal protection utility.

Run with:
    python -m pytest src/agent-worker/tests/test_file_manager.py -v
"""

from __future__ import annotations

import os
import sys
import textwrap

import pytest

# Allow importing from the parent package without installing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from tools.file_manager import FileManager, PathTraversalError


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def workspace(tmp_path):
    """Return a FileManager whose workspace lives under a pytest tmp_path."""
    wm = FileManager(base_workspace=str(tmp_path), project_id="test-project")
    wm.workspace_root.mkdir(parents=True, exist_ok=True)
    return wm


# ---------------------------------------------------------------------------
# safe_path
# ---------------------------------------------------------------------------

class TestSafePath:
    def test_simple_relative_path(self, workspace):
        p = workspace.safe_path("reports/summary.md")
        assert p == workspace.workspace_root / "reports" / "summary.md"

    def test_nested_path(self, workspace):
        p = workspace.safe_path("a/b/c/d.txt")
        assert str(p).startswith(str(workspace.workspace_root))

    def test_dot_in_path_is_fine(self, workspace):
        p = workspace.safe_path("./subdir/file.txt")
        assert p == workspace.workspace_root / "subdir" / "file.txt"

    def test_traversal_two_dots_raises(self, workspace):
        with pytest.raises(PathTraversalError):
            workspace.safe_path("../../etc/passwd")

    def test_traversal_absolute_path_outside_raises(self, workspace):
        with pytest.raises(PathTraversalError):
            workspace.safe_path("/etc/passwd")

    def test_traversal_mixed_raises(self, workspace):
        with pytest.raises(PathTraversalError):
            workspace.safe_path("reports/../../../../etc/shadow")

    def test_workspace_root_itself_is_safe(self, workspace):
        p = workspace.safe_path(".")
        assert p == workspace.workspace_root


# ---------------------------------------------------------------------------
# read_file / write_file
# ---------------------------------------------------------------------------

class TestReadWrite:
    def test_write_and_read(self, workspace):
        workspace.write_file("hello.txt", "world")
        assert workspace.read_file("hello.txt") == "world"

    def test_write_creates_parents(self, workspace):
        workspace.write_file("a/b/c.txt", "deep")
        assert (workspace.workspace_root / "a" / "b" / "c.txt").exists()

    def test_read_missing_file_raises(self, workspace):
        with pytest.raises(FileNotFoundError):
            workspace.read_file("nonexistent.txt")

    def test_write_traversal_raises(self, workspace):
        with pytest.raises(PathTraversalError):
            workspace.write_file("../../evil.txt", "bad")

    def test_read_traversal_raises(self, workspace):
        with pytest.raises(PathTraversalError):
            workspace.read_file("../../etc/passwd")


# ---------------------------------------------------------------------------
# delete_file
# ---------------------------------------------------------------------------

class TestDeleteFile:
    def test_delete_existing_file(self, workspace):
        workspace.write_file("to_delete.txt", "bye")
        workspace.delete_file("to_delete.txt")
        assert not workspace.exists("to_delete.txt")

    def test_delete_nonexistent_file_is_noop(self, workspace):
        workspace.delete_file("ghost.txt")  # should not raise

    def test_delete_traversal_raises(self, workspace):
        with pytest.raises(PathTraversalError):
            workspace.delete_file("../../passwd")


# ---------------------------------------------------------------------------
# list_files
# ---------------------------------------------------------------------------

class TestListFiles:
    def test_list_empty_workspace(self, workspace):
        assert workspace.list_files() == []

    def test_list_returns_all_files(self, workspace):
        workspace.write_file("a.txt", "1")
        workspace.write_file("sub/b.txt", "2")
        workspace.write_file("sub/nested/c.txt", "3")
        files = workspace.list_files()
        names = {p.name for p in files}
        assert names == {"a.txt", "b.txt", "c.txt"}

    def test_list_subdirectory(self, workspace):
        workspace.write_file("sub/x.txt", "x")
        workspace.write_file("sub/y.txt", "y")
        files = workspace.list_files("sub")
        assert len(files) == 2

    def test_list_traversal_raises(self, workspace):
        with pytest.raises(PathTraversalError):
            workspace.list_files("../../")


# ---------------------------------------------------------------------------
# exists
# ---------------------------------------------------------------------------

class TestExists:
    def test_exists_true(self, workspace):
        workspace.write_file("present.txt", "yes")
        assert workspace.exists("present.txt")

    def test_exists_false(self, workspace):
        assert not workspace.exists("absent.txt")

    def test_exists_traversal_returns_false(self, workspace):
        # Should not raise – just return False safely
        assert not workspace.exists("../../etc/passwd")


# ---------------------------------------------------------------------------
# cleanup_tmp
# ---------------------------------------------------------------------------

class TestCleanupTmp:
    def test_cleanup_removes_files(self, workspace):
        tmp = workspace.workspace_root / "tmp"
        tmp.mkdir(exist_ok=True)
        (tmp / "junk1.txt").write_text("x")
        (tmp / "junk2.log").write_text("y")
        count = workspace.cleanup_tmp()
        assert count == 2
        assert list(tmp.iterdir()) == []

    def test_cleanup_no_tmp_dir(self, workspace):
        count = workspace.cleanup_tmp()
        assert count == 0


# ---------------------------------------------------------------------------
# Constructor validation
# ---------------------------------------------------------------------------

class TestConstructorValidation:
    def test_empty_project_id_raises(self, tmp_path):
        with pytest.raises(ValueError):
            FileManager(base_workspace=str(tmp_path), project_id="")

    def test_slash_in_project_id_raises(self, tmp_path):
        with pytest.raises(ValueError):
            FileManager(base_workspace=str(tmp_path), project_id="proj/subdir")

    def test_dotdot_project_id_raises(self, tmp_path):
        with pytest.raises(ValueError):
            FileManager(base_workspace=str(tmp_path), project_id="..")
