"""
Tests for tools/workspace_tools.py

All tests operate inside a temporary directory and never touch the real
/app/workspace path, so they are safe to run without Docker.
"""

from __future__ import annotations

import os
import pathlib
import pytest

# ---------------------------------------------------------------------------
# Fixture: isolate workspace to a temp directory for every test.
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def isolated_workspace(tmp_path, monkeypatch):
    """Redirect WORKSPACE_DIR to *tmp_path* for the duration of each test."""
    monkeypatch.setenv("WORKSPACE_DIR", str(tmp_path))
    # Re-import so the module picks up the new env var.
    import importlib
    import tools.workspace_tools as wt
    monkeypatch.setattr(wt, "WORKSPACE_DIR", tmp_path.resolve())
    yield tmp_path


# ---------------------------------------------------------------------------
# workspace_write / workspace_read
# ---------------------------------------------------------------------------

def test_write_and_read_roundtrip(isolated_workspace):
    from tools.workspace_tools import workspace_write, workspace_read

    content = "Hello, APF!\nSecond line."
    workspace_write("hello.txt", content)
    assert workspace_read("hello.txt") == content


def test_write_creates_parent_dirs(isolated_workspace):
    from tools.workspace_tools import workspace_write, workspace_read

    workspace_write("sub/dir/file.md", "# Title")
    assert workspace_read("sub/dir/file.md") == "# Title"


def test_write_raises_on_existing_file_without_overwrite(isolated_workspace):
    from tools.workspace_tools import workspace_write

    workspace_write("existing.txt", "original")
    with pytest.raises(FileExistsError):
        workspace_write("existing.txt", "new content")


def test_write_overwrite_flag(isolated_workspace):
    from tools.workspace_tools import workspace_write, workspace_read

    workspace_write("file.txt", "v1")
    workspace_write("file.txt", "v2", overwrite=True)
    assert workspace_read("file.txt") == "v2"


# ---------------------------------------------------------------------------
# workspace_list
# ---------------------------------------------------------------------------

def test_list_empty_workspace(isolated_workspace):
    from tools.workspace_tools import workspace_list

    assert workspace_list() == []


def test_list_returns_relative_paths(isolated_workspace):
    from tools.workspace_tools import workspace_write, workspace_list

    workspace_write("a.txt", "a")
    workspace_write("sub/b.txt", "b")
    files = workspace_list()
    assert "a.txt" in files
    assert "sub/b.txt" in files


def test_list_sub_directory(isolated_workspace):
    from tools.workspace_tools import workspace_write, workspace_list

    workspace_write("root.txt", "r")
    workspace_write("sub/inner.txt", "i")
    files = workspace_list("sub")
    assert "sub/inner.txt" in files
    assert "root.txt" not in files


# ---------------------------------------------------------------------------
# Path-traversal security
# ---------------------------------------------------------------------------

def test_traversal_blocked_read(isolated_workspace):
    from tools.workspace_tools import workspace_read

    with pytest.raises(PermissionError):
        workspace_read("../../etc/passwd")


def test_traversal_blocked_write(isolated_workspace):
    from tools.workspace_tools import workspace_write

    with pytest.raises(PermissionError):
        workspace_write("../../tmp/evil.txt", "hacked")


def test_traversal_blocked_list(isolated_workspace):
    from tools.workspace_tools import workspace_list

    with pytest.raises(PermissionError):
        workspace_list("../../etc")


def test_empty_path_raises(isolated_workspace):
    from tools.workspace_tools import workspace_read

    with pytest.raises(ValueError):
        workspace_read("")


def test_blank_path_raises(isolated_workspace):
    from tools.workspace_tools import workspace_read

    with pytest.raises(ValueError):
        workspace_read("   ")


# ---------------------------------------------------------------------------
# workspace_read errors
# ---------------------------------------------------------------------------

def test_read_missing_file_raises(isolated_workspace):
    from tools.workspace_tools import workspace_read

    with pytest.raises(FileNotFoundError):
        workspace_read("does_not_exist.txt")


def test_read_directory_raises(isolated_workspace, tmp_path):
    from tools.workspace_tools import workspace_read

    (tmp_path / "adir").mkdir()
    with pytest.raises(IsADirectoryError):
        workspace_read("adir")


# ---------------------------------------------------------------------------
# workspace_delete
# ---------------------------------------------------------------------------

def test_delete_file(isolated_workspace):
    from tools.workspace_tools import workspace_write, workspace_delete, workspace_list

    workspace_write("todelete.txt", "bye")
    workspace_delete("todelete.txt")
    assert "todelete.txt" not in workspace_list()


def test_delete_missing_file_raises(isolated_workspace):
    from tools.workspace_tools import workspace_delete

    with pytest.raises(FileNotFoundError):
        workspace_delete("ghost.txt")


# ---------------------------------------------------------------------------
# CrewAI tool wrappers
# ---------------------------------------------------------------------------

def test_tool_read_text(isolated_workspace):
    from tools.workspace_tools import workspace_write, tool_read

    workspace_write("data.txt", "content")
    assert tool_read("data.txt") == "content"


def test_tool_write_and_read(isolated_workspace):
    from tools.workspace_tools import tool_write, tool_read

    tool_write("output.md", "# Output")
    assert tool_read("output.md") == "# Output"


def test_tool_list_returns_string(isolated_workspace):
    from tools.workspace_tools import workspace_write, tool_list

    workspace_write("a.txt", "a")
    result = tool_list()
    assert "a.txt" in result


def test_tool_list_empty_workspace_message(isolated_workspace):
    from tools.workspace_tools import tool_list

    assert tool_list() == "(workspace is empty)"
