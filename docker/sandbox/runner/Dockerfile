# Ephemeral sandbox runner image.
# This image is instantiated by execution_tool.py for every code-execution
# request.  It is intentionally minimal to reduce attack surface.
#
# Security posture:
#   • Non-root user (uid/gid 10000)
#   • No network (enforced at container-run time via --network none)
#   • /tmp is a tmpfs mount (no persistence)
#   • Output written to /output (mounted rw from host)
#   • Source workspace mounted at /workspace (read-only)

FROM python:3.10-slim

# Install only the packages agents are likely to need for data analysis / PDF
# generation.  Extend as required – keep the image small.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Common data-science / PDF libraries.
# Pin versions for reproducibility.
RUN pip install --no-cache-dir \
    pandas==2.2.2 \
    matplotlib==3.8.4 \
    reportlab==4.2.0 \
    openpyxl==3.1.4 \
    Pillow==10.3.0

# Create non-root user
RUN groupadd -g 10000 sandbox && \
    useradd -u 10000 -g sandbox -m -s /sbin/nologin sandbox

# Workspace and output directories
RUN mkdir -p /workspace /output /tmp && \
    chown sandbox:sandbox /output /tmp

USER sandbox
WORKDIR /workspace

# The entrypoint executes whatever script is injected at run time.
# execution_tool.py passes: docker run ... apf/sandbox-runner python /tmp/script.py
ENTRYPOINT ["python"]
