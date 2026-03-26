/**
 * APF – PersonaService (api-server)
 *
 * Provides persona CRUD operations and similarity search for the Bun/Elysia
 * API server. Communicates with Supabase using the JS SDK so that RLS
 * policies are enforced and the service stays within the standard Supabase
 * data-access layer.
 *
 * All public methods are typed against the Database interface defined in
 * src/shared/types/database.ts so that the compiler catches mismatches early.
 */

import { type } from "arktype";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  type Database,
  type Persona,
  type PersonaInsert,
  type PersonaUpdate,
  type MatchPersonaResult,
  PersonaInsert as PersonaInsertValidator,
  PersonaUpdate as PersonaUpdateValidator,
} from "../../shared/types/database";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    "Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY"
  );
}

// ---------------------------------------------------------------------------
// PersonaService
// ---------------------------------------------------------------------------

export class PersonaService {
  private readonly db: SupabaseClient<Database>;

  constructor(
    supabaseUrl: string = SUPABASE_URL,
    supabaseKey: string = SUPABASE_SERVICE_KEY
  ) {
    this.db = createClient<Database>(supabaseUrl, supabaseKey);
  }

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  /** Retrieve all personas ordered by creation date (newest first). */
  async listPersonas(): Promise<Persona[]> {
    const { data, error } = await this.db
      .from("personas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`listPersonas: ${error.message}`);
    return data ?? [];
  }

  /** Retrieve a single persona by its UUID. */
  async getPersonaById(id: string): Promise<Persona | null> {
    const { data, error } = await this.db
      .from("personas")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`getPersonaById: ${error.message}`);
    return data ?? null;
  }

  /** Create a new persona record. Returns the inserted row. */
  async createPersona(payload: PersonaInsert): Promise<Persona> {
    const validated = PersonaInsertValidator(payload);
    if (validated instanceof type.errors) {
      throw new TypeError(`createPersona validation: ${validated.summary}`);
    }

    const { data, error } = await this.db
      .from("personas")
      .insert(validated)
      .select()
      .single();

    if (error) throw new Error(`createPersona: ${error.message}`);
    return data;
  }

  /** Update an existing persona. Returns the updated row. */
  async updatePersona(id: string, payload: PersonaUpdate): Promise<Persona> {
    const validated = PersonaUpdateValidator(payload);
    if (validated instanceof type.errors) {
      throw new TypeError(`updatePersona validation: ${validated.summary}`);
    }

    const { data, error } = await this.db
      .from("personas")
      .update(validated)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`updatePersona: ${error.message}`);
    return data;
  }

  /** Delete a persona. Returns the deleted row. */
  async deletePersona(id: string): Promise<Persona> {
    const { data, error } = await this.db
      .from("personas")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`deletePersona: ${error.message}`);
    return data;
  }

  // -------------------------------------------------------------------------
  // Vector similarity search
  // -------------------------------------------------------------------------

  /**
   * Find personas similar to *queryEmbedding* using the match_personas RPC.
   *
   * The embedding must be a 1024-dim float array produced by the same model
   * (voyage-3 / cohere) used during ingestion.
   */
  async findSimilarPersonas(
    queryEmbedding: number[],
    matchThreshold = 0.7,
    matchCount = 5
  ): Promise<MatchPersonaResult[]> {
    const { data, error } = await this.db.rpc("match_personas", {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) throw new Error(`findSimilarPersonas: ${error.message}`);
    return data ?? [];
  }

  // -------------------------------------------------------------------------
  // Convenience helpers
  // -------------------------------------------------------------------------

  /**
   * Return personas that contain *searchTerm* in their name, role, goal, or
   * backstory using Postgres full-text search (ilike fallback).
   */
  async searchPersonas(searchTerm: string): Promise<Persona[]> {
    const { data, error } = await this.db
      .from("personas")
      .select("*")
      .or(
        [
          `name.ilike.%${searchTerm}%`,
          `role.ilike.%${searchTerm}%`,
          `goal.ilike.%${searchTerm}%`,
          `backstory.ilike.%${searchTerm}%`,
        ].join(",")
      )
      .order("created_at", { ascending: false });

    if (error) throw new Error(`searchPersonas: ${error.message}`);
    return data ?? [];
  }
}

// ---------------------------------------------------------------------------
// Singleton export (typical Bun/Elysia usage)
// ---------------------------------------------------------------------------

export const personaService = new PersonaService();
