"""
execution_tool.py
~~~~~~~~~~~~~~~~~
CrewAI / LangGraph tool that executes arbitrary Python code inside an
ephemeral, network-isolated Docker container ("sandbox runner").

Architecture
------------
When an agent calls this tool it:

1. Writes the requested code to a temporary file on the host.
2. Starts a fresh ``apf/sandbox-runner`` container via the Docker SDK with:
   - ``--network none``          – no network access
   - ``--memory 128m``           – memory cap
   - ``--cpus 0.5``              – CPU cap
   - ``--cap-drop ALL``          – drop all Linux capabilities
   - ``--security-opt no-new-privileges``
   - workspace volume mounted read-only at ``/workspace``
   - output directory mounted read-write at ``/output``
   - a tmpfs at ``/tmp``
3. Passes the script as ``/tmp/script.py`` via an in-memory tar archive so no
   host file needs to be written with open permissions.
4. Waits for the container to finish (timeout configurable).
5. Returns STDOUT, STDERR, exit code, and a list of files written to
   ``/output``.
6. Removes the container unconditionally (``auto_remove=True``).

Requirements
------------
    pip install docker>=7.0.0

CrewAI integration
------------------
    from execution_tool import SandboxExecutionTool
    tool = SandboxExecutionTool(project_id="proj-123")
    result = tool.run(code="print('hello')")

LangGraph integration
---------------------
    from execution_tool import sandbox_execution_tool_factory
    tool = sandbox_execution_tool_factory(project_id="proj-123")
    # use as a LangChain/LangGraph tool in your graph
"""

from __future__ import annotations

import io
import os
import tarfile
import tempfile
import textwrap
import time
from dataclasses import dataclass, field
from typing import Any

try:
    import docker  # type: ignore[import]
    from docker.errors import ContainerError, DockerException, ImageNotFound  # type: ignore[import]
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "The 'docker' package is required for SandboxExecutionTool. "
        "Install it with: pip install docker>=7.0.0"
    ) from exc


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class ExecutionResult:
    """Structured result from a sandbox execution."""

    stdout: str = ""
    stderr: str = ""
    exit_code: int = 0
    output_files: list[str] = field(default_factory=list)
    timed_out: bool = False
    error: str = ""

    def success(self) -> bool:
        return self.exit_code == 0 and not self.timed_out and not self.error

    def to_dict(self) -> dict[str, Any]:
        return {
            "stdout": self.stdout,
            "stderr": self.stderr,
            "exit_code": self.exit_code,
            "output_files": self.output_files,
            "timed_out": self.timed_out,
            "error": self.error,
            "success": self.success(),
        }


# ---------------------------------------------------------------------------
# Core executor
# ---------------------------------------------------------------------------

class SandboxExecutor:
    """Low-level executor: runs Python code in an ephemeral Docker container.

    Parameters
    ----------
    workspace_root:
        Host path to the workspaces root (e.g. ``/data/workspaces``).
    project_id:
        The project whose workspace will be mounted in the container.
    sandbox_image:
        Docker image tag to use as the runner.
    memory_limit:
        Memory limit string accepted by Docker (e.g. ``"128m"``).
    cpu_limit:
        CPU quota as a float (e.g. ``0.5``).
    timeout:
        Maximum seconds to wait for the container to finish.
    output_dir:
        Host path where runner output files will be written.
    """

    DEFAULT_IMAGE = "apf/sandbox-runner:latest"
    DEFAULT_MEMORY = "128m"
    DEFAULT_CPU = 0.5
    DEFAULT_TIMEOUT = 60  # seconds

    def __init__(
        self,
        workspace_root: str,
        project_id: str,
        sandbox_image: str | None = None,
        memory_limit: str | None = None,
        cpu_limit: float | None = None,
        timeout: int | None = None,
        output_dir: str | None = None,
    ) -> None:
        self.workspace_root = workspace_root
        self.project_id = project_id
        self.sandbox_image = sandbox_image or os.getenv(
            "SANDBOX_IMAGE", self.DEFAULT_IMAGE
        )
        self.memory_limit = memory_limit or os.getenv(
            "SANDBOX_MEMORY_LIMIT", self.DEFAULT_MEMORY
        )
        self.cpu_limit = cpu_limit or float(
            os.getenv("SANDBOX_CPU_LIMIT", str(self.DEFAULT_CPU))
        )
        self.timeout = timeout or self.DEFAULT_TIMEOUT
        self._output_dir = output_dir or os.getenv(
            "RUNNER_OUTPUT_DIR", "/runner_output"
        )
        self._client = docker.from_env()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run(self, code: str) -> ExecutionResult:
        """Execute *code* in the sandbox and return an :class:`ExecutionResult`."""
        result = ExecutionResult()
        container = None

        project_workspace = os.path.join(self.workspace_root, self.project_id)
        output_dir = os.path.join(self._output_dir, self.project_id)
        os.makedirs(output_dir, exist_ok=True)

        try:
            container = self._start_container(project_workspace, output_dir, code)
            timed_out = not self._wait_for_container(container)
            if timed_out:
                result.timed_out = True
                try:
                    container.kill()
                except DockerException:
                    pass
            else:
                container.reload()
                result.exit_code = container.attrs["State"]["ExitCode"]

            logs = container.logs(stdout=True, stderr=True)
            # Separate stdout and stderr if available
            try:
                stdout_logs = container.logs(stdout=True, stderr=False).decode(
                    "utf-8", errors="replace"
                )
                stderr_logs = container.logs(stdout=False, stderr=True).decode(
                    "utf-8", errors="replace"
                )
            except Exception:
                combined = logs.decode("utf-8", errors="replace") if logs else ""
                stdout_logs = combined
                stderr_logs = ""

            result.stdout = stdout_logs
            result.stderr = stderr_logs
            result.output_files = self._list_output_files(output_dir)

        except ImageNotFound:
            result.error = (
                f"Sandbox image '{self.sandbox_image}' not found. "
                "Run 'docker build -t apf/sandbox-runner:latest docker/sandbox/runner/' first."
            )
            result.exit_code = -1
        except ContainerError as exc:
            result.error = str(exc)
            result.exit_code = exc.exit_status
        except DockerException as exc:
            result.error = f"Docker error: {exc}"
            result.exit_code = -1
        finally:
            if container is not None:
                try:
                    container.remove(force=True)
                except DockerException:
                    pass

        return result

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _start_container(
        self, project_workspace: str, output_dir: str, code: str
    ):
        """Create and start the sandbox container, injecting the script."""
        # Prepare volumes:
        # - workspace  → /workspace (read-only)
        # - output_dir → /output    (read-write)
        volumes = {
            project_workspace: {"bind": "/workspace", "mode": "ro"},
            output_dir: {"bind": "/output", "mode": "rw"},
        }

        container = self._client.containers.create(
            image=self.sandbox_image,
            command=["/tmp/script.py"],
            user="10000:10000",
            network_mode="none",
            mem_limit=self.memory_limit,
            nano_cpus=round(self.cpu_limit * 1e9),
            cap_drop=["ALL"],
            security_opt=["no-new-privileges:true"],
            read_only=True,
            volumes=volumes,
            tmpfs={"/tmp": "size=64m,uid=10000,gid=10000"},
            environment={
                "PYTHONDONTWRITEBYTECODE": "1",
                "PYTHONUNBUFFERED": "1",
            },
            detach=True,
        )

        # Inject the script as /tmp/script.py via a tar archive
        self._copy_script_to_container(container, code)
        container.start()
        return container

    @staticmethod
    def _copy_script_to_container(container, code: str) -> None:
        """Write *code* to ``/tmp/script.py`` inside *container* via docker cp."""
        encoded = code.encode("utf-8")
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w") as tar:
            info = tarfile.TarInfo(name="script.py")
            info.size = len(encoded)
            info.mode = 0o644
            tar.addfile(info, io.BytesIO(encoded))
        buf.seek(0)
        container.put_archive("/tmp", buf)

    def _wait_for_container(self, container) -> bool:
        """Block until the container exits or *timeout* is reached.

        Returns ``True`` if the container exited normally, ``False`` on timeout.
        """
        deadline = time.monotonic() + self.timeout
        while time.monotonic() < deadline:
            container.reload()
            if container.status in {"exited", "dead"}:
                return True
            time.sleep(0.5)
        return False

    @staticmethod
    def _list_output_files(output_dir: str) -> list[str]:
        """Return a list of relative paths for all files in *output_dir*."""
        result = []
        for root, _, files in os.walk(output_dir):
            for fname in files:
                abs_path = os.path.join(root, fname)
                result.append(os.path.relpath(abs_path, output_dir))
        return sorted(result)


# ---------------------------------------------------------------------------
# CrewAI Tool wrapper
# ---------------------------------------------------------------------------

try:
    from crewai.tools import BaseTool  # type: ignore[import]
    from pydantic import BaseModel, Field  # type: ignore[import]

    class _SandboxInput(BaseModel):
        code: str = Field(..., description="Python source code to execute in the sandbox.")

    class SandboxExecutionTool(BaseTool):
        """CrewAI tool – executes Python code in an isolated Docker sandbox."""

        name: str = "sandbox_code_executor"
        description: str = (
            "Executes Python code in a completely isolated, network-free Docker "
            "sandbox with 128 MB RAM and 0.5 CPU. "
            "Use this tool when you need to run data analysis, generate PDFs, "
            "process CSVs, or produce any file output. "
            "The workspace is available read-only at /workspace. "
            "Write output files to /output – they will be accessible after execution."
        )
        args_schema: type[BaseModel] = _SandboxInput

        # Injected at construction time
        _executor: SandboxExecutor

        def __init__(self, project_id: str, **kwargs: Any) -> None:
            super().__init__(**kwargs)
            self._executor = SandboxExecutor(
                workspace_root=os.getenv("WORKSPACE_ROOT", "/data/workspaces"),
                project_id=project_id,
            )

        def _run(self, code: str) -> str:  # type: ignore[override]
            result = self._executor.run(code)
            return self._format_result(result)

        @staticmethod
        def _format_result(result: ExecutionResult) -> str:
            lines = []
            if result.error:
                lines.append(f"[ERROR] {result.error}")
            if result.timed_out:
                lines.append("[TIMEOUT] Execution exceeded time limit.")
            lines.append(f"[EXIT CODE] {result.exit_code}")
            if result.stdout:
                lines.append(f"[STDOUT]\n{result.stdout}")
            if result.stderr:
                lines.append(f"[STDERR]\n{result.stderr}")
            if result.output_files:
                lines.append(
                    "[OUTPUT FILES]\n" + "\n".join(f"  /output/{f}" for f in result.output_files)
                )
            return "\n".join(lines) if lines else "(no output)"

except ImportError:
    # crewai not installed – define a minimal stand-alone version
    class SandboxExecutionTool:  # type: ignore[no-redef]
        """Stand-alone wrapper (crewai not installed)."""

        def __init__(self, project_id: str, **kwargs: Any) -> None:
            self._executor = SandboxExecutor(
                workspace_root=os.getenv("WORKSPACE_ROOT", "/data/workspaces"),
                project_id=project_id,
            )

        def run(self, code: str) -> ExecutionResult:
            return self._executor.run(code)


# ---------------------------------------------------------------------------
# LangGraph / LangChain tool factory
# ---------------------------------------------------------------------------

def sandbox_execution_tool_factory(project_id: str, **executor_kwargs: Any):
    """Return a LangChain-compatible ``StructuredTool`` for sandbox execution.

    Falls back gracefully if ``langchain_core`` is not installed.
    """
    try:
        from langchain_core.tools import StructuredTool  # type: ignore[import]
        from pydantic import BaseModel, Field  # type: ignore[import]

        class _Input(BaseModel):
            code: str = Field(..., description="Python code to run in the sandbox.")

        executor = SandboxExecutor(
            workspace_root=os.getenv("WORKSPACE_ROOT", "/data/workspaces"),
            project_id=project_id,
            **executor_kwargs,
        )

        def _execute(code: str) -> dict[str, Any]:
            return executor.run(code).to_dict()

        return StructuredTool(
            name="sandbox_code_executor",
            description=(
                "Executes Python code in a completely isolated, network-free Docker "
                "sandbox (128 MB RAM, 0.5 CPU). Workspace available at /workspace (ro). "
                "Write results to /output (rw)."
            ),
            func=_execute,
            args_schema=_Input,
        )
    except ImportError:
        # Return the plain executor if LangChain is not available
        executor = SandboxExecutor(
            workspace_root=os.getenv("WORKSPACE_ROOT", "/data/workspaces"),
            project_id=project_id,
            **executor_kwargs,
        )
        return executor
