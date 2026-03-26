"""
APF – VectorService (agent-worker)
====================================
Handles chunking → embedding → upsert → query for all three vector tables:
  * knowledge_chunks  (RAG document retrieval)
  * agent_memories    (long-term semantic recall)
  * personas          (personality similarity)

Embedding model: voyage-ai (voyage-3) producing 1024-dim vectors.
Supabase client:  psycopg2 + supabase-py (REST for metadata, psycopg2 for
                  bulk vector upserts which are faster than REST for large
                  batches).

Environment variables expected:
    SUPABASE_URL          – e.g. https://<ref>.supabase.co
    SUPABASE_SERVICE_KEY  – service-role JWT (full DB access)
    VOYAGE_API_KEY        – voyage-ai API key
    POSTGRES_DSN          – direct Postgres connection string (optional;
                            falls back to REST upserts via supabase-py)
"""

from __future__ import annotations

import os
import re
import uuid
import logging
from dataclasses import dataclass, field
from typing import Any

import psycopg2
import psycopg2.extras
import voyageai
from supabase import Client, create_client

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

EMBEDDING_DIM = 1024
DEFAULT_CHUNK_SIZE = 512      # characters
DEFAULT_CHUNK_OVERLAP = 64    # characters
DEFAULT_MATCH_THRESHOLD = 0.78
DEFAULT_MATCH_COUNT = 10

# ---------------------------------------------------------------------------
# Data containers
# ---------------------------------------------------------------------------


@dataclass
class KnowledgeChunk:
    content: str
    project_id: str
    metadata: dict[str, Any] = field(default_factory=dict)
    id: str = field(default_factory=lambda: str(uuid.uuid4()))


@dataclass
class MemoryEntry:
    session_id: str
    role: str  # 'user' | 'assistant' | 'system' | 'summary'
    content: str
    persona_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    id: str = field(default_factory=lambda: str(uuid.uuid4()))


@dataclass
class MatchResult:
    id: str
    content: str
    metadata: dict[str, Any]
    similarity: float


# ---------------------------------------------------------------------------
# VectorService
# ---------------------------------------------------------------------------


class VectorService:
    """Centralised vector operations for the APF agent-worker."""

    def __init__(
        self,
        supabase_url: str | None = None,
        supabase_key: str | None = None,
        voyage_api_key: str | None = None,
        postgres_dsn: str | None = None,
    ) -> None:
        self._supabase_url = supabase_url or os.environ["SUPABASE_URL"]
        self._supabase_key = supabase_key or os.environ["SUPABASE_SERVICE_KEY"]
        self._voyage_api_key = voyage_api_key or os.environ.get("VOYAGE_API_KEY", "")
        self._postgres_dsn = postgres_dsn or os.environ.get("POSTGRES_DSN")

        if not self._voyage_api_key:
            raise ValueError(
                "VOYAGE_API_KEY is required. "
                "Set the VOYAGE_API_KEY environment variable or pass it explicitly."
            )

        # Supabase REST client (used for RPC calls & metadata queries)
        self._sb: Client = create_client(self._supabase_url, self._supabase_key)

        # voyage-ai embedding client
        self._voyage = voyageai.Client(api_key=self._voyage_api_key)

        # Optional direct psycopg2 connection for bulk upserts
        self._pg_conn: psycopg2.extensions.connection | None = None
        if self._postgres_dsn:
            self._pg_conn = psycopg2.connect(self._postgres_dsn)
            psycopg2.extras.register_uuid(self._pg_conn)

    # ------------------------------------------------------------------
    # Embedding helpers
    # ------------------------------------------------------------------

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Return 1024-dim embeddings for a batch of texts."""
        if not texts:
            return []
        result = self._voyage.embed(
            texts,
            model="voyage-3",
            input_type="document",
        )
        return result.embeddings

    def embed_query(self, text: str) -> list[float]:
        """Return a single 1024-dim embedding optimised for retrieval queries."""
        result = self._voyage.embed(
            [text],
            model="voyage-3",
            input_type="query",
        )
        return result.embeddings[0]

    # ------------------------------------------------------------------
    # Chunking
    # ------------------------------------------------------------------

    @staticmethod
    def chunk_text(
        text: str,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        overlap: int = DEFAULT_CHUNK_OVERLAP,
    ) -> list[str]:
        """Split *text* into overlapping character-level chunks.

        For production use consider a sentence-aware or token-aware splitter;
        this simple implementation is intentionally dependency-free.
        """
        # Normalise whitespace
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) <= chunk_size:
            return [text]

        chunks: list[str] = []
        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunks.append(text[start:end])
            start += chunk_size - overlap

        return chunks

    # ------------------------------------------------------------------
    # knowledge_chunks – upsert & query
    # ------------------------------------------------------------------

    def ingest_document(
        self,
        text: str,
        project_id: str,
        source_file: str = "",
        extra_metadata: dict[str, Any] | None = None,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        overlap: int = DEFAULT_CHUNK_OVERLAP,
    ) -> list[str]:
        """Chunk, embed, and upsert a document into knowledge_chunks.

        Returns a list of inserted chunk UUIDs.
        """
        raw_chunks = self.chunk_text(text, chunk_size, overlap)
        embeddings = self.embed_texts(raw_chunks)

        records: list[KnowledgeChunk] = [
            KnowledgeChunk(
                content=chunk,
                project_id=project_id,
                metadata={
                    "source_file": source_file,
                    "chunk_index": i,
                    **(extra_metadata or {}),
                },
            )
            for i, chunk in enumerate(raw_chunks)
        ]

        return self._upsert_knowledge_chunks(records, embeddings)

    def _upsert_knowledge_chunks(
        self,
        records: list[KnowledgeChunk],
        embeddings: list[list[float]],
    ) -> list[str]:
        """Persist chunks; uses psycopg2 for bulk inserts when DSN is set."""
        if self._pg_conn:
            return self._pg_upsert_knowledge_chunks(records, embeddings)
        return self._rest_upsert_knowledge_chunks(records, embeddings)

    def _pg_upsert_knowledge_chunks(
        self,
        records: list[KnowledgeChunk],
        embeddings: list[list[float]],
    ) -> list[str]:
        sql = """
            insert into public.knowledge_chunks
                (id, content, embedding, metadata, project_id)
            values %s
            on conflict (id) do update set
                content   = excluded.content,
                embedding = excluded.embedding,
                metadata  = excluded.metadata
            returning id
        """
        rows = [
            (
                r.id,
                r.content,
                embeddings[i],
                psycopg2.extras.Json(r.metadata),
                r.project_id,
            )
            for i, r in enumerate(records)
        ]
        with self._pg_conn.cursor() as cur:  # type: ignore[union-attr]
            psycopg2.extras.execute_values(cur, sql, rows, page_size=100)
            inserted_ids = [str(row[0]) for row in cur.fetchall()]
            self._pg_conn.commit()  # type: ignore[union-attr]
        logger.info("Upserted %d knowledge chunks (psycopg2)", len(inserted_ids))
        return inserted_ids

    def _rest_upsert_knowledge_chunks(
        self,
        records: list[KnowledgeChunk],
        embeddings: list[list[float]],
    ) -> list[str]:
        payload = [
            {
                "id": r.id,
                "content": r.content,
                "embedding": embeddings[i],
                "metadata": r.metadata,
                "project_id": r.project_id,
            }
            for i, r in enumerate(records)
        ]
        response = (
            self._sb.table("knowledge_chunks")
            .upsert(payload, on_conflict="id")
            .execute()
        )
        inserted_ids = [row["id"] for row in (response.data or [])]
        logger.info("Upserted %d knowledge chunks (REST)", len(inserted_ids))
        return inserted_ids

    def query_knowledge(
        self,
        query: str,
        project_id: str,
        match_threshold: float = DEFAULT_MATCH_THRESHOLD,
        match_count: int = DEFAULT_MATCH_COUNT,
    ) -> list[MatchResult]:
        """Semantic search over knowledge_chunks for *project_id*."""
        embedding = self.embed_query(query)
        response = self._sb.rpc(
            "match_knowledge",
            {
                "query_embedding": embedding,
                "p_project_id": project_id,
                "match_threshold": match_threshold,
                "match_count": match_count,
            },
        ).execute()
        return [
            MatchResult(
                id=row["id"],
                content=row["content"],
                metadata=row["metadata"],
                similarity=row["similarity"],
            )
            for row in (response.data or [])
        ]

    # ------------------------------------------------------------------
    # agent_memories – upsert & query
    # ------------------------------------------------------------------

    def save_memory(self, entry: MemoryEntry) -> str:
        """Embed and persist a single memory entry. Returns the UUID."""
        embedding = self.embed_texts([entry.content])[0]

        payload = {
            "id": entry.id,
            "session_id": entry.session_id,
            "role": entry.role,
            "content": entry.content,
            "embedding": embedding,
            "metadata": entry.metadata,
        }
        if entry.persona_id:
            payload["persona_id"] = entry.persona_id

        self._sb.table("agent_memories").upsert(payload, on_conflict="id").execute()
        logger.info("Saved memory %s (session=%s)", entry.id, entry.session_id)
        return entry.id

    def recall_memories(
        self,
        query: str,
        session_id: str,
        match_threshold: float = 0.75,
        match_count: int = DEFAULT_MATCH_COUNT,
    ) -> list[MatchResult]:
        """Semantically recall the most relevant memories for a session."""
        embedding = self.embed_query(query)
        response = self._sb.rpc(
            "match_memories",
            {
                "query_embedding": embedding,
                "p_session_id": session_id,
                "match_threshold": match_threshold,
                "match_count": match_count,
            },
        ).execute()
        return [
            MatchResult(
                id=row["id"],
                content=row["content"],
                metadata=row["metadata"],
                similarity=row["similarity"],
            )
            for row in (response.data or [])
        ]

    # ------------------------------------------------------------------
    # personas – upsert & similarity search
    # ------------------------------------------------------------------

    def upsert_persona_embedding(
        self,
        persona_id: str,
        personality_text: str,
    ) -> None:
        """Generate and store the personality embedding for a persona."""
        embedding = self.embed_texts([personality_text])[0]
        self._sb.table("personas").update({"embedding": embedding}).eq(
            "id", persona_id
        ).execute()
        logger.info("Updated embedding for persona %s", persona_id)

    def find_similar_personas(
        self,
        query: str,
        match_threshold: float = 0.70,
        match_count: int = 5,
    ) -> list[MatchResult]:
        """Find personas whose personality embedding is closest to *query*."""
        embedding = self.embed_query(query)
        response = self._sb.rpc(
            "match_personas",
            {
                "query_embedding": embedding,
                "match_threshold": match_threshold,
                "match_count": match_count,
            },
        ).execute()
        return [
            MatchResult(
                id=row["id"],
                content=row.get("backstory", ""),
                metadata={
                    "name": row.get("name"),
                    "role": row.get("role"),
                    "goal": row.get("goal"),
                    "settings": row.get("settings"),
                },
                similarity=row["similarity"],
            )
            for row in (response.data or [])
        ]

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def close(self) -> None:
        """Release any open database connections."""
        if self._pg_conn:
            self._pg_conn.close()
            self._pg_conn = None

    def __enter__(self) -> "VectorService":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
