-- =============================================================================
-- APF (Agentic Persona Factory) - Vector Storage Initialization
-- =============================================================================
-- Embedding dimension: 1024 (voyage-ai / cohere compatible)
-- =============================================================================

-- Enable pgvector extension
-- NOTE: Supabase adds the 'extensions' schema to search_path by default,
-- so vector types are accessible in the public schema without qualification.
create extension if not exists vector with schema extensions;

-- =============================================================================
-- Table: personas
-- Stores role configuration and a personality embedding for similarity matching
-- =============================================================================
create table if not exists public.personas (
    id            uuid primary key default gen_random_uuid(),
    name          text not null,
    role          text not null,
    goal          text not null,
    backstory     text not null,
    -- JSONB bag for extra provider-specific settings (e.g. temperature, model)
    settings      jsonb not null default '{}'::jsonb,
    -- 1024-dim personality embedding (voyage-ai / cohere)
    embedding     vector(1024),
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

-- Trigger: keep updated_at current
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

create trigger personas_updated_at
    before update on public.personas
    for each row execute procedure public.set_updated_at();

-- HNSW index for fast approximate nearest-neighbour search on personas
create index if not exists personas_embedding_idx
    on public.personas
    using hnsw (embedding vector_cosine_ops)
    with (m = 16, ef_construction = 64);

-- =============================================================================
-- Table: knowledge_chunks
-- Stores chunked document content with embeddings for RAG retrieval
-- =============================================================================
create table if not exists public.knowledge_chunks (
    id            uuid primary key default gen_random_uuid(),
    -- Text content of this chunk
    content       text not null,
    -- Embedding for the content
    embedding     vector(1024),
    -- Metadata: source_file, project_id, page, chunk_index, etc.
    metadata      jsonb not null default '{}'::jsonb,
    -- Direct foreign-key shortcut for the most common filter
    project_id    text not null,
    created_at    timestamptz not null default now()
);

-- HNSW index for fast ANN search on knowledge_chunks
create index if not exists knowledge_chunks_embedding_idx
    on public.knowledge_chunks
    using hnsw (embedding vector_cosine_ops)
    with (m = 16, ef_construction = 64);

-- B-tree index to speed up project_id equality filters
create index if not exists knowledge_chunks_project_id_idx
    on public.knowledge_chunks (project_id);

-- =============================================================================
-- Table: agent_memories
-- Stores long-term interaction history linked to a session
-- =============================================================================
create table if not exists public.agent_memories (
    id            uuid primary key default gen_random_uuid(),
    session_id    text not null,
    -- Which persona generated / owns this memory
    persona_id    uuid references public.personas (id) on delete set null,
    -- Role in the conversation: 'user' | 'assistant' | 'system' | 'summary'
    role          text not null check (role in ('user', 'assistant', 'system', 'summary')),
    content       text not null,
    -- Embedding of the memory content for semantic recall
    embedding     vector(1024),
    -- Arbitrary metadata (tool calls, token counts, timestamps, …)
    metadata      jsonb not null default '{}'::jsonb,
    created_at    timestamptz not null default now()
);

-- HNSW index for semantic memory recall
create index if not exists agent_memories_embedding_idx
    on public.agent_memories
    using hnsw (embedding vector_cosine_ops)
    with (m = 16, ef_construction = 64);

-- B-tree indexes for common equality filters
create index if not exists agent_memories_session_id_idx
    on public.agent_memories (session_id);

create index if not exists agent_memories_persona_id_idx
    on public.agent_memories (persona_id);

-- =============================================================================
-- RPC Function: match_knowledge
-- Performs cosine-similarity search over knowledge_chunks for a given project.
--
-- Parameters:
--   query_embedding  – The embedding vector to search against (1024 dims).
--   p_project_id     – Filter results to a single project.
--   match_threshold  – Minimum cosine similarity score (0–1).
--   match_count      – Maximum number of rows to return.
--
-- Returns: id, content, metadata, similarity score
-- =============================================================================
create or replace function public.match_knowledge(
    query_embedding  vector(1024),
    p_project_id     text,
    match_threshold  float  default 0.78,
    match_count      int    default 10
)
returns table (
    id          uuid,
    content     text,
    metadata    jsonb,
    similarity  float
)
language sql stable
as $$
    select
        kc.id,
        kc.content,
        kc.metadata,
        -- pgvector's <=> is cosine distance; convert to similarity
        1 - (kc.embedding <=> query_embedding) as similarity
    from
        public.knowledge_chunks kc
    where
        kc.project_id = p_project_id
        and kc.embedding is not null
        and 1 - (kc.embedding <=> query_embedding) >= match_threshold
    order by
        kc.embedding <=> query_embedding
    limit match_count;
$$;

-- =============================================================================
-- RPC Function: match_memories
-- Semantically recalls the most relevant memories for a given session.
--
-- Parameters:
--   query_embedding  – The embedding vector to search against.
--   p_session_id     – Filter results to a single session.
--   match_threshold  – Minimum cosine similarity score.
--   match_count      – Maximum number of rows to return.
-- =============================================================================
create or replace function public.match_memories(
    query_embedding  vector(1024),
    p_session_id     text,
    match_threshold  float  default 0.75,
    match_count      int    default 10
)
returns table (
    id          uuid,
    role        text,
    content     text,
    metadata    jsonb,
    similarity  float
)
language sql stable
as $$
    select
        am.id,
        am.role,
        am.content,
        am.metadata,
        1 - (am.embedding <=> query_embedding) as similarity
    from
        public.agent_memories am
    where
        am.session_id = p_session_id
        and am.embedding is not null
        and 1 - (am.embedding <=> query_embedding) >= match_threshold
    order by
        am.embedding <=> query_embedding
    limit match_count;
$$;

-- =============================================================================
-- RPC Function: match_personas
-- Finds personas whose personality embedding is most similar to the query.
--
-- Parameters:
--   query_embedding  – The embedding vector to compare against.
--   match_threshold  – Minimum cosine similarity score.
--   match_count      – Maximum number of rows to return.
-- =============================================================================
create or replace function public.match_personas(
    query_embedding  vector(1024),
    match_threshold  float  default 0.70,
    match_count      int    default 5
)
returns table (
    id          uuid,
    name        text,
    role        text,
    goal        text,
    backstory   text,
    settings    jsonb,
    similarity  float
)
language sql stable
as $$
    select
        p.id,
        p.name,
        p.role,
        p.goal,
        p.backstory,
        p.settings,
        1 - (p.embedding <=> query_embedding) as similarity
    from
        public.personas p
    where
        p.embedding is not null
        and 1 - (p.embedding <=> query_embedding) >= match_threshold
    order by
        p.embedding <=> query_embedding
    limit match_count;
$$;

-- =============================================================================
-- Row Level Security (RLS) - enable but keep permissive for service role
-- Tighten these policies when auth is wired up.
-- =============================================================================
alter table public.personas         enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.agent_memories   enable row level security;

-- Service-role bypass (used by backend workers)
create policy "service_role_all_personas"
    on public.personas for all
    to service_role
    using (true) with check (true);

create policy "service_role_all_knowledge_chunks"
    on public.knowledge_chunks for all
    to service_role
    using (true) with check (true);

create policy "service_role_all_agent_memories"
    on public.agent_memories for all
    to service_role
    using (true) with check (true);
