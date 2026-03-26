"""
file_manager.py
~~~~~~~~~~~~~~~
Workspace file-management utility for the APF agent-worker.

Security guarantee
------------------
Every path returned by this module is guaranteed to reside **inside** the
project workspace.  Path-traversal attacks (e.g. ``../../etc/passwd``) are
detected and rejected before any filesystem operation is attempted.

Usage example
-------------
>>> fm = FileManager(base_workspace="/data/workspaces", project_id="proj-123")
>>> safe = fm.safe_path("reports/summary.md")
>>> fm.write_file("reports/summary.md", "# Hello")
>>> content = fm.read_file("reports/summary.md")
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path


class PathTraversalError(ValueError):
    """Raised when a requested path escapes the workspace boundary."""


class FileManager:
    """Provides sandboxed read/write access to a single project workspace.

    Parameters
    ----------
    base_workspace:
        Root directory that contains all project workspaces
        (e.g. ``/data/workspaces``).
    project_id:
        Identifier for the current project.  Must not contain ``/`` or ``..``.
    """

    def __init__(self, base_workspace: str | Path, project_id: str) -> None:
        self._base_workspace = Path(base_workspace).resolve()
        self._validate_project_id(project_id)
        self.project_id = project_id
        self.workspace_root: Path = (self._base_workspace / project_id).resolve()

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    def safe_path(self, relative_path: str | Path) -> Path:
        """Resolve *relative_path* inside the workspace and verify it is safe.

        Raises
        ------
        PathTraversalError
            If the resolved path falls outside ``self.workspace_root``.
        """
        # Resolve without requiring the path to exist yet.
        resolved = (self.workspace_root / relative_path).resolve()
        self._assert_within_workspace(resolved)
        return resolved

    def read_file(self, relative_path: str | Path) -> str:
        """Return the text contents of *relative_path* inside the workspace."""
        path = self.safe_path(relative_path)
        return path.read_text(encoding="utf-8")

    def write_file(self, relative_path: str | Path, content: str) -> Path:
        """Write *content* to *relative_path* (creates parent dirs as needed).

        Returns the absolute Path that was written.
        """
        path = self.safe_path(relative_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return path

    def delete_file(self, relative_path: str | Path) -> None:
        """Delete a single file inside the workspace."""
        path = self.safe_path(relative_path)
        if path.is_file():
            path.unlink()

    def list_files(self, relative_dir: str | Path = ".") -> list[Path]:
        """Return all files under *relative_dir* as absolute Paths."""
        directory = self.safe_path(relative_dir)
        if not directory.is_dir():
            return []
        return [p for p in directory.rglob("*") if p.is_file()]

    def exists(self, relative_path: str | Path) -> bool:
        """Return ``True`` if *relative_path* exists inside the workspace."""
        try:
            return self.safe_path(relative_path).exists()
        except PathTraversalError:
            return False

    def cleanup_tmp(self) -> int:
        """Remove all files under the ``tmp/`` sub-directory.

        Returns the number of files deleted.
        """
        tmp_dir = self.workspace_root / "tmp"
        if not tmp_dir.is_dir():
            return 0
        count = 0
        for item in list(tmp_dir.iterdir()):
            if item.is_file():
                item.unlink()
                count += 1
            elif item.is_dir():
                shutil.rmtree(item)
                count += 1
        return count

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _assert_within_workspace(self, resolved: Path) -> None:
        """Raise :class:`PathTraversalError` if *resolved* escapes the workspace."""
        try:
            resolved.relative_to(self.workspace_root)
        except ValueError:
            raise PathTraversalError(
                f"Path '{resolved}' is outside the workspace "
                f"'{self.workspace_root}'."
            )

    @staticmethod
    def _validate_project_id(project_id: str) -> None:
        """Reject project IDs that could be used for directory traversal."""
        if not project_id or "/" in project_id or project_id in {".", ".."}:
            raise ValueError(
                f"Invalid project_id '{project_id}': must be a non-empty string "
                "without '/' or '..'."
            )
