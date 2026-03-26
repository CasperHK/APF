"""
Safe workspace file-handling tools for APF agents.

All file operations are strictly sandboxed to WORKSPACE_DIR (/app/workspace).
Any attempt to access paths outside this directory raises a PermissionError.
"""

from __future__ import annotations

import os
import pathlib
import logging
from typing import List

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Workspace root – can be overridden via environment variable for testing.
# ---------------------------------------------------------------------------
WORKSPACE_DIR = pathlib.Path(os.environ.get("WORKSPACE_DIR", "/app/workspace")).resolve()


def _safe_path(relative_path: str) -> pathlib.Path:
    """Resolve *relative_path* inside WORKSPACE_DIR and guard against traversal.

    Parameters
    ----------
    relative_path:
        A path that must resolve to a location inside WORKSPACE_DIR.

    Raises
    ------
    PermissionError
        When the resolved path escapes WORKSPACE_DIR.
    ValueError
        When *relative_path* is empty.
    """
    if not relative_path or not relative_path.strip():
        raise ValueError("relative_path must not be empty.")

    resolved = (WORKSPACE_DIR / relative_path).resolve()

    # Guard against path-traversal attacks.
    if not str(resolved).startswith(str(WORKSPACE_DIR)):
        raise PermissionError(
            f"Access denied: '{relative_path}' resolves outside the secure workspace."
        )
    return resolved


# ---------------------------------------------------------------------------
# Core workspace tools
# ---------------------------------------------------------------------------

def workspace_read(relative_path: str) -> str:
    """Read a text file from the secure workspace.

    Supported formats: .txt, .md, .csv, .json, .yaml, .yml, .html, .xml.
    For binary document parsing (PDF/DOCX) see :func:`workspace_read_document`.

    Parameters
    ----------
    relative_path:
        Path relative to WORKSPACE_DIR.

    Returns
    -------
    str
        The file contents as a UTF-8 string.
    """
    path = _safe_path(relative_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found in workspace: {relative_path}")
    if not path.is_file():
        raise IsADirectoryError(f"Path is a directory, not a file: {relative_path}")

    logger.info("workspace_read: %s", path)
    return path.read_text(encoding="utf-8")


def workspace_write(relative_path: str, content: str, overwrite: bool = False) -> str:
    """Write *content* to a file in the secure workspace.

    Parameters
    ----------
    relative_path:
        Destination path relative to WORKSPACE_DIR.
    content:
        Text content to write.
    overwrite:
        When ``False`` (default) raise ``FileExistsError`` if the file already
        exists, preventing accidental data loss.

    Returns
    -------
    str
        Confirmation message with the written file path.
    """
    path = _safe_path(relative_path)
    if path.exists() and not overwrite:
        raise FileExistsError(
            f"File already exists: {relative_path}. "
            "Pass overwrite=True to replace it."
        )

    # Create parent directories if necessary (within workspace).
    path.parent.mkdir(parents=True, exist_ok=True)

    path.write_text(content, encoding="utf-8")
    logger.info("workspace_write: %s (%d bytes)", path, len(content.encode("utf-8")))
    return f"Successfully wrote {len(content)} characters to workspace/{relative_path}"


def workspace_list(sub_directory: str = "") -> List[str]:
    """List files recursively inside *sub_directory* of the workspace.

    Parameters
    ----------
    sub_directory:
        Optional sub-path within WORKSPACE_DIR.  Defaults to the workspace
        root.

    Returns
    -------
    List[str]
        Sorted list of relative file paths (relative to WORKSPACE_DIR).
    """
    base = _safe_path(sub_directory) if sub_directory else WORKSPACE_DIR
    if not base.exists():
        return []
    if not base.is_dir():
        raise NotADirectoryError(f"Not a directory: {sub_directory}")

    files: List[str] = []
    for item in sorted(base.rglob("*")):
        if item.is_file():
            files.append(str(item.relative_to(WORKSPACE_DIR)))
    logger.info("workspace_list: %d files under '%s'", len(files), sub_directory or ".")
    return files


def workspace_read_document(relative_path: str) -> str:
    """Extract plain text from a PDF or DOCX file in the workspace.

    Uses *unstructured* if available, otherwise falls back to *pypdf* for PDF
    and *python-docx* for DOCX.

    Parameters
    ----------
    relative_path:
        Path relative to WORKSPACE_DIR.

    Returns
    -------
    str
        Extracted text content.
    """
    path = _safe_path(relative_path)
    if not path.exists():
        raise FileNotFoundError(f"Document not found in workspace: {relative_path}")

    suffix = path.suffix.lower()
    logger.info("workspace_read_document: %s (type=%s)", path, suffix)

    # ------------------------------------------------------------------
    # Attempt to use the `unstructured` library (preferred).
    # ------------------------------------------------------------------
    try:
        from unstructured.partition.auto import partition  # type: ignore

        elements = partition(filename=str(path))
        return "\n".join(str(el) for el in elements)
    except ImportError:
        pass  # Fall through to format-specific parsers.

    # ------------------------------------------------------------------
    # PDF fallback: pypdf
    # ------------------------------------------------------------------
    if suffix == ".pdf":
        try:
            import pypdf  # type: ignore

            reader = pypdf.PdfReader(str(path))
            pages = [page.extract_text() or "" for page in reader.pages]
            return "\n".join(pages)
        except ImportError as exc:
            raise ImportError(
                "Neither 'unstructured' nor 'pypdf' is installed. "
                "Install one to enable PDF reading."
            ) from exc

    # ------------------------------------------------------------------
    # DOCX fallback: python-docx
    # ------------------------------------------------------------------
    if suffix in {".docx", ".doc"}:
        try:
            import docx  # type: ignore

            doc = docx.Document(str(path))
            return "\n".join(para.text for para in doc.paragraphs)
        except ImportError as exc:
            raise ImportError(
                "Neither 'unstructured' nor 'python-docx' is installed. "
                "Install one to enable DOCX reading."
            ) from exc

    # ------------------------------------------------------------------
    # Plain text fallback for other extensions.
    # ------------------------------------------------------------------
    return workspace_read(relative_path)


def workspace_delete(relative_path: str) -> str:
    """Delete a file from the secure workspace.

    Parameters
    ----------
    relative_path:
        Path relative to WORKSPACE_DIR.

    Returns
    -------
    str
        Confirmation message.
    """
    path = _safe_path(relative_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found in workspace: {relative_path}")
    if not path.is_file():
        raise IsADirectoryError(
            f"Path is a directory. Use workspace_rmdir to remove directories."
        )
    path.unlink()
    logger.info("workspace_delete: %s", path)
    return f"Deleted workspace/{relative_path}"


# ---------------------------------------------------------------------------
# CrewAI-compatible tool wrappers
# ---------------------------------------------------------------------------
# These thin wrappers expose workspace tools as plain callables that CrewAI
# agents can invoke via their `tools` list.  Each wrapper returns a string
# so it can be fed directly into an LLM context.

def tool_read(path: str) -> str:
    """CrewAI tool: read a workspace file (text or document)."""
    suffix = pathlib.Path(path).suffix.lower()
    if suffix in {".pdf", ".docx", ".doc"}:
        return workspace_read_document(path)
    return workspace_read(path)


def tool_write(path: str, content: str) -> str:
    """CrewAI tool: write content to a workspace file (overwrite allowed)."""
    return workspace_write(path, content, overwrite=True)


def tool_list(sub_dir: str = "") -> str:
    """CrewAI tool: list workspace files, returns newline-separated paths."""
    files = workspace_list(sub_dir)
    return "\n".join(files) if files else "(workspace is empty)"
