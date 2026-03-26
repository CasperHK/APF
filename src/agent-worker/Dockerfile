# ---------------------------------------------------------------------------
# APF Agent-Worker Container
# ---------------------------------------------------------------------------
# Multi-stage Python image optimised for AI workloads:
#   Stage 1 (builder)  – compile native extensions (wheels) in isolation.
#   Stage 2 (runtime)  – lean final image with only runtime artifacts.
# ---------------------------------------------------------------------------

# ---- Stage 1: Builder -------------------------------------------------------
FROM python:3.11-slim AS builder

# System libraries required by unstructured, pypdf, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libmagic1 \
        poppler-utils \
        tesseract-ocr \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY requirements.txt .

# Build wheels for all dependencies.
RUN pip install --upgrade pip \
    && pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt


# ---- Stage 2: Runtime -------------------------------------------------------
FROM python:3.11-slim AS runtime

LABEL maintainer="APF Team <apf@example.com>"
LABEL description="APF Agent-Worker – Python AI brain container"

# Install only the shared libraries needed at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libmagic1 \
        poppler-utils \
        tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security.
RUN useradd --create-home --shell /bin/bash apfworker

# Install Python packages from the pre-built wheels.
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links /wheels /wheels/*.whl \
    && rm -rf /wheels

# Application code.
WORKDIR /app
COPY . /app/

# Secure workspace mount-point (populated at runtime by docker-compose volume).
RUN mkdir -p /app/workspace && chown apfworker:apfworker /app/workspace

# Switch to non-root.
USER apfworker

# Environment defaults (overridden by docker-compose / Kubernetes secrets).
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    REDIS_URL=redis://redis:6379/0 \
    APF_JOB_CHANNEL=apf:jobs \
    APF_LOG_CHANNEL=apf:agent_logs \
    WORKSPACE_DIR=/app/workspace

# Health-check: verify the Redis URL is reachable (requires redis-cli).
# Soft health-check via Python ping.
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import redis, os; r=redis.from_url(os.environ['REDIS_URL']); r.ping()" \
    || exit 1

CMD ["python", "main.py"]
