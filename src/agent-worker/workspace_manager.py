"""
workspace_manager.py
~~~~~~~~~~~~~~~~~~~~
Workspace lifecycle manager for the APF agent-worker.

Responsibilities
----------------
* **Initialize** a new workspace from a template (directory scaffold + metadata).
* **Calculate disk usage** (quota enforcement hook).
* **Cleanup** temporary files, expired workspaces, and orphaned output.

Usage
-----
    from workspace_manager import WorkspaceManager

    wm = WorkspaceManager(base_path="/data/workspaces")

    # Create a fresh workspace for a project
    info = wm.init_workspace("proj-abc123")

    # Get current disk usage in bytes
    used = wm.get_disk_usage("proj-abc123")

    # Remove all temp files
    removed = wm.cleanup_tmp("proj-abc123")

    # Permanently delete a workspace
    wm.delete_workspace("proj-abc123")
"""

from __future__ import annotations

import json
import os
import shutil
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class WorkspaceInfo:
    """Metadata for a single project workspace."""

    project_id: str
    root: str                            # Absolute path on host
    created_at: str                      # ISO-8601 timestamp
    last_accessed: str                   # ISO-8601 timestamp
    quota_bytes: int = 1_073_741_824     # Default quota: 1 GiB
    tags: dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "WorkspaceInfo":
        return cls(**data)


# ---------------------------------------------------------------------------
# WorkspaceManager
# ---------------------------------------------------------------------------

class WorkspaceManager:
    """Manages project workspaces under *base_path*.

    Parameters
    ----------
    base_path:
        Root directory that contains all workspaces
        (e.g. ``/data/workspaces``).
    template_path:
        Optional path to a directory whose contents are copied into every new
        workspace.  Defaults to the ``workspace-template`` dir shipped with
        the docker/sandbox configuration.
    default_quota_bytes:
        Maximum allowed disk usage per workspace (bytes).  Default: 1 GiB.
    """

    METADATA_FILE = ".workspace_meta.json"
    # Sub-directories created in every workspace
    WORKSPACE_SUBDIRS = ("input", "output", "tmp")

    def __init__(
        self,
        base_path: str | Path,
        template_path: str | Path | None = None,
        default_quota_bytes: int = 1_073_741_824,
    ) -> None:
        self.base_path = Path(base_path).resolve()
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.template_path: Path | None = (
            Path(template_path).resolve() if template_path else None
        )
        self.default_quota_bytes = default_quota_bytes

    # ------------------------------------------------------------------
    # Workspace lifecycle
    # ------------------------------------------------------------------

    def init_workspace(
        self,
        project_id: str,
        tags: dict[str, str] | None = None,
        quota_bytes: int | None = None,
    ) -> WorkspaceInfo:
        """Create and initialise a new workspace for *project_id*.

        If the workspace already exists the existing metadata is returned
        without overwriting any files.

        Parameters
        ----------
        project_id:
            Unique identifier for the project.
        tags:
            Optional key-value metadata to attach to the workspace.
        quota_bytes:
            Override the default quota for this workspace.

        Returns
        -------
        WorkspaceInfo
            Metadata for the (newly created or existing) workspace.
        """
        self._validate_project_id(project_id)
        workspace = self.base_path / project_id

        if workspace.exists():
            # Load and return existing metadata
            return self._load_metadata(workspace)

        workspace.mkdir(parents=True, mode=0o750)

        # Copy template if provided
        if self.template_path and self.template_path.is_dir():
            self._copy_template(self.template_path, workspace)
        else:
            # Scaffold standard sub-directories
            for sub in self.WORKSPACE_SUBDIRS:
                (workspace / sub).mkdir(exist_ok=True)

        now = _utcnow()
        info = WorkspaceInfo(
            project_id=project_id,
            root=str(workspace),
            created_at=now,
            last_accessed=now,
            quota_bytes=quota_bytes or self.default_quota_bytes,
            tags=tags or {},
        )
        self._save_metadata(workspace, info)
        return info

    def get_workspace(self, project_id: str) -> WorkspaceInfo:
        """Return metadata for an existing workspace.

        Raises
        ------
        FileNotFoundError
            If the workspace does not exist.
        """
        self._validate_project_id(project_id)
        workspace = self.base_path / project_id
        if not workspace.is_dir():
            raise FileNotFoundError(
                f"Workspace for project '{project_id}' does not exist."
            )
        info = self._load_metadata(workspace)
        # Update last_accessed timestamp
        info.last_accessed = _utcnow()
        self._save_metadata(workspace, info)
        return info

    def list_workspaces(self) -> list[WorkspaceInfo]:
        """Return metadata for all known workspaces."""
        result = []
        for entry in sorted(self.base_path.iterdir()):
            if entry.is_dir() and not entry.name.startswith("."):
                try:
                    result.append(self._load_metadata(entry))
                except (FileNotFoundError, KeyError, TypeError):
                    continue
        return result

    def delete_workspace(self, project_id: str) -> None:
        """Permanently delete the workspace for *project_id*."""
        self._validate_project_id(project_id)
        workspace = self.base_path / project_id
        if workspace.is_dir():
            shutil.rmtree(workspace)

    # ------------------------------------------------------------------
    # Disk usage & quotas
    # ------------------------------------------------------------------

    def get_disk_usage(self, project_id: str) -> int:
        """Return total disk usage in bytes for *project_id*'s workspace."""
        self._validate_project_id(project_id)
        workspace = self.base_path / project_id
        if not workspace.is_dir():
            raise FileNotFoundError(
                f"Workspace for project '{project_id}' does not exist."
            )
        return sum(f.stat().st_size for f in workspace.rglob("*") if f.is_file())

    def check_quota(self, project_id: str) -> tuple[int, int, bool]:
        """Check the quota status of *project_id*'s workspace.

        Returns
        -------
        (used_bytes, quota_bytes, over_quota)
        """
        info = self.get_workspace(project_id)
        used = self.get_disk_usage(project_id)
        return used, info.quota_bytes, used > info.quota_bytes

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    def cleanup_tmp(self, project_id: str) -> int:
        """Delete all files and sub-directories under ``{workspace}/tmp/``.

        Returns the number of top-level items removed.
        """
        self._validate_project_id(project_id)
        tmp_dir = self.base_path / project_id / "tmp"
        if not tmp_dir.is_dir():
            return 0
        count = 0
        for item in list(tmp_dir.iterdir()):
            if item.is_file() or item.is_symlink():
                item.unlink()
            elif item.is_dir():
                shutil.rmtree(item)
            count += 1
        return count

    def cleanup_output(self, project_id: str) -> int:
        """Delete all files under ``{workspace}/output/``.

        Returns the number of files removed.
        """
        self._validate_project_id(project_id)
        output_dir = self.base_path / project_id / "output"
        if not output_dir.is_dir():
            return 0
        count = 0
        for item in list(output_dir.iterdir()):
            if item.is_file() or item.is_symlink():
                item.unlink()
                count += 1
            elif item.is_dir():
                removed = sum(1 for _ in item.rglob("*") if _.is_file())
                shutil.rmtree(item)
                count += removed
        return count

    def purge_stale_workspaces(self, max_age_seconds: float) -> list[str]:
        """Remove workspaces that have not been accessed for *max_age_seconds*.

        Returns a list of deleted project IDs.
        """
        deleted = []
        now = time.time()
        for info in self.list_workspaces():
            try:
                last = datetime.fromisoformat(info.last_accessed).timestamp()
            except ValueError:
                continue
            if (now - last) >= max_age_seconds:
                self.delete_workspace(info.project_id)
                deleted.append(info.project_id)
        return deleted

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _load_metadata(self, workspace: Path) -> WorkspaceInfo:
        meta_file = workspace / self.METADATA_FILE
        if not meta_file.is_file():
            raise FileNotFoundError(
                f"Metadata file not found in workspace '{workspace}'."
            )
        with meta_file.open("r", encoding="utf-8") as fh:
            return WorkspaceInfo.from_dict(json.load(fh))

    @staticmethod
    def _save_metadata(workspace: Path, info: WorkspaceInfo) -> None:
        meta_file = workspace / WorkspaceManager.METADATA_FILE
        with meta_file.open("w", encoding="utf-8") as fh:
            json.dump(info.to_dict(), fh, indent=2)

    @staticmethod
    def _copy_template(src: Path, dst: Path) -> None:
        """Copy *src* directory tree into *dst* (non-destructive)."""
        for item in src.rglob("*"):
            if item.name == ".gitkeep":
                continue
            relative = item.relative_to(src)
            target = dst / relative
            if item.is_dir():
                target.mkdir(parents=True, exist_ok=True)
            elif item.is_file():
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(item, target)

    @staticmethod
    def _validate_project_id(project_id: str) -> None:
        if not project_id or "/" in project_id or project_id in {".", ".."}:
            raise ValueError(
                f"Invalid project_id '{project_id}': must be a non-empty string "
                "without '/' or '..'."
            )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()
