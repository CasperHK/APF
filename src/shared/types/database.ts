/**
 * APF – Database Schema TypeScript Definitions
 *
 * Aligned with ArkType for runtime validation.
 * Embedding dimension: 1024 (voyage-ai / cohere compatible).
 */

import { type } from "arktype";

// ---------------------------------------------------------------------------
// Primitive helpers
// ---------------------------------------------------------------------------

/** ISO-8601 timestamp string as returned by Supabase / Postgres */
export const Timestamp = type("string");

/** UUID v4 string */
export const UuidString = type("string");

// ---------------------------------------------------------------------------
// Table: personas
// ---------------------------------------------------------------------------

export const PersonaSettings = type({
  "model?": "string",
  "temperature?": "number",
  "max_tokens?": "number",
  "[string]": "unknown",
});

export const Persona = type({
  id: UuidString,
  name: "string",
  role: "string",
  goal: "string",
  backstory: "string",
  settings: PersonaSettings,
  /** Personality embedding (1024-dim). Null before first embed. */
  embedding: type("number[]").or("null"),
  created_at: Timestamp,
  updated_at: Timestamp,
});

export const PersonaInsert = type({
  id: UuidString.optional(),
  name: "string",
  role: "string",
  goal: "string",
  backstory: "string",
  "settings?": PersonaSettings,
  "embedding?": type("number[]").or("null"),
});

export const PersonaUpdate = type({
  "name?": "string",
  "role?": "string",
  "goal?": "string",
  "backstory?": "string",
  "settings?": PersonaSettings,
  "embedding?": type("number[]").or("null"),
});

export type Persona = typeof Persona.infer;
export type PersonaInsert = typeof PersonaInsert.infer;
export type PersonaUpdate = typeof PersonaUpdate.infer;
export type PersonaSettings = typeof PersonaSettings.infer;

// ---------------------------------------------------------------------------
// Table: knowledge_chunks
// ---------------------------------------------------------------------------

export const KnowledgeChunkMetadata = type({
  source_file: type("string").optional(),
  project_id: type("string").optional(),
  page: type("number").optional(),
  chunk_index: type("number").optional(),
  "[string]": "unknown",
});

export const KnowledgeChunk = type({
  id: UuidString,
  content: "string",
  embedding: type("number[]").or("null"),
  metadata: KnowledgeChunkMetadata,
  project_id: "string",
  created_at: Timestamp,
});

export const KnowledgeChunkInsert = type({
  "id?": UuidString,
  content: "string",
  "embedding?": type("number[]").or("null"),
  "metadata?": KnowledgeChunkMetadata,
  project_id: "string",
});

export type KnowledgeChunk = typeof KnowledgeChunk.infer;
export type KnowledgeChunkInsert = typeof KnowledgeChunkInsert.infer;
export type KnowledgeChunkMetadata = typeof KnowledgeChunkMetadata.infer;

// ---------------------------------------------------------------------------
// Table: agent_memories
// ---------------------------------------------------------------------------

export const MemoryRole = type(
  '"user" | "assistant" | "system" | "summary"'
);

export const AgentMemoryMetadata = type({
  "tool_calls?": "unknown[]",
  "token_count?": "number",
  "[string]": "unknown",
});

export const AgentMemory = type({
  id: UuidString,
  session_id: "string",
  persona_id: UuidString.or("null"),
  role: MemoryRole,
  content: "string",
  embedding: type("number[]").or("null"),
  metadata: AgentMemoryMetadata,
  created_at: Timestamp,
});

export const AgentMemoryInsert = type({
  "id?": UuidString,
  session_id: "string",
  "persona_id?": UuidString.or("null"),
  role: MemoryRole,
  content: "string",
  "embedding?": type("number[]").or("null"),
  "metadata?": AgentMemoryMetadata,
});

export type AgentMemory = typeof AgentMemory.infer;
export type AgentMemoryInsert = typeof AgentMemoryInsert.infer;
export type MemoryRole = typeof MemoryRole.infer;

// ---------------------------------------------------------------------------
// RPC return types
// ---------------------------------------------------------------------------

export const MatchKnowledgeResult = type({
  id: UuidString,
  content: "string",
  metadata: KnowledgeChunkMetadata,
  similarity: "number",
});

export const MatchMemoryResult = type({
  id: UuidString,
  role: MemoryRole,
  content: "string",
  metadata: AgentMemoryMetadata,
  similarity: "number",
});

export const MatchPersonaResult = type({
  id: UuidString,
  name: "string",
  role: "string",
  goal: "string",
  backstory: "string",
  settings: PersonaSettings,
  similarity: "number",
});

export type MatchKnowledgeResult = typeof MatchKnowledgeResult.infer;
export type MatchMemoryResult = typeof MatchMemoryResult.infer;
export type MatchPersonaResult = typeof MatchPersonaResult.infer;

// ---------------------------------------------------------------------------
// Full database type (mirrors Supabase generated types shape)
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      personas: {
        Row: Persona;
        Insert: PersonaInsert;
        Update: PersonaUpdate;
      };
      knowledge_chunks: {
        Row: KnowledgeChunk;
        Insert: KnowledgeChunkInsert;
        Update: Partial<KnowledgeChunkInsert>;
      };
      agent_memories: {
        Row: AgentMemory;
        Insert: AgentMemoryInsert;
        Update: Partial<AgentMemoryInsert>;
      };
    };
    Functions: {
      match_knowledge: {
        Args: {
          query_embedding: number[];
          p_project_id: string;
          match_threshold?: number;
          match_count?: number;
        };
        Returns: MatchKnowledgeResult[];
      };
      match_memories: {
        Args: {
          query_embedding: number[];
          p_session_id: string;
          match_threshold?: number;
          match_count?: number;
        };
        Returns: MatchMemoryResult[];
      };
      match_personas: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
        };
        Returns: MatchPersonaResult[];
      };
    };
  };
}
