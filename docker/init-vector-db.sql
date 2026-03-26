-- Initialize pgvector extension for APF long-term memory
CREATE EXTENSION IF NOT EXISTS vector;

-- Agent memory table
CREATE TABLE IF NOT EXISTS agent_memory (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     TEXT NOT NULL,
  content      TEXT NOT NULL,
  embedding    vector(1536),
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Brand knowledge table
CREATE TABLE IF NOT EXISTS brand_knowledge (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   TEXT NOT NULL,
  content      TEXT NOT NULL,
  embedding    vector(1536),
  source       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast vector similarity search
CREATE INDEX IF NOT EXISTS agent_memory_embedding_idx
  ON agent_memory USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS brand_knowledge_embedding_idx
  ON brand_knowledge USING hnsw (embedding vector_cosine_ops);
