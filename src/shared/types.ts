import { type as ark } from "arktype";
export { ArkErrors } from "arktype";

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export const JobStatus = ark("'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'");
export type JobStatus = typeof JobStatus.infer;

export const LogLevel = ark(
  "'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'AGENT_THOUGHT' | 'AGENT_ACTION' | 'AGENT_RESULT'"
);
export type LogLevel = typeof LogLevel.infer;

export const ConversationRole = ark("'user' | 'assistant' | 'system'");
export type ConversationRole = typeof ConversationRole.infer;

// ---------------------------------------------------------------------------
// Job / Task Queue
// ---------------------------------------------------------------------------

/**
 * Pushed by the Bun API Server onto `queue:tasks` (LPUSH).
 * Popped by the Python Agent Worker (BRPOP).
 */
export const JobMessage = ark({
  job_id: "string",
  session_id: "string",
  persona_id: "string",
  task_type: "string",
  payload: ark({ "prompt": "string", "context_turns?": "number" }).or("Record<string, unknown>"),
  created_at: "string", // ISO 8601
});
export type JobMessage = typeof JobMessage.infer;

// ---------------------------------------------------------------------------
// Task Status
// ---------------------------------------------------------------------------

/**
 * Stored in Redis Hash `job:{job_id}:status`.
 * Written by the Bun server (PENDING) and updated by Python worker.
 */
export const JobStatusRecord = ark({
  job_id: "string",
  session_id: "string",
  persona_id: "string",
  status: JobStatus,
  "worker_id?": "string",
  created_at: "string",
  "started_at?": "string",
  "finished_at?": "string",
  "error?": "string",
  "result?": "string", // JSON-serialised output
});
export type JobStatusRecord = typeof JobStatusRecord.infer;

// ---------------------------------------------------------------------------
// Streaming Logs (Pub/Sub)
// ---------------------------------------------------------------------------

/**
 * Published to `channel:logs:{job_id}` by the Python worker.
 * Subscribed to by the Bun server, forwarded to the browser over WebSocket.
 */
export const LogMessage = ark({
  job_id: "string",
  level: LogLevel,
  source: "string", // persona_id or worker identifier
  message: "string",
  timestamp: "string", // ISO 8601
  "metadata?": "Record<string, unknown>",
});
export type LogMessage = typeof LogMessage.infer;

// ---------------------------------------------------------------------------
// Short-term Conversation Memory
// ---------------------------------------------------------------------------

/**
 * A single turn in the conversation history.
 */
export const ConversationTurn = ark({
  role: ConversationRole,
  content: "string",
  timestamp: "string",
  "agent_id?": "string", // only for assistant turns
});
export type ConversationTurn = typeof ConversationTurn.infer;

/**
 * Stored in Redis Hash `session:{session_id}:memory`.
 * `turns` is stored as a JSON-serialised array of `ConversationTurn`.
 */
export const SessionMemory = ark({
  session_id: "string",
  persona_id: "string",
  user_id: "string",
  turns: ConversationTurn.array(),
  turn_count: "number",
  created_at: "string",
  last_active: "string",
});
export type SessionMemory = typeof SessionMemory.infer;

// ---------------------------------------------------------------------------
// WebSocket Events (Bun → Browser)
// ---------------------------------------------------------------------------

/**
 * Envelope sent from the Bun server to the browser over WebSocket.
 */
export const WsEvent = ark({
  event: "'log' | 'status_change' | 'job_complete' | 'job_failed'",
  job_id: "string",
  data: LogMessage.or(JobStatusRecord),
});
export type WsEvent = typeof WsEvent.infer;

// ---------------------------------------------------------------------------
// Redis Key Helpers
// ---------------------------------------------------------------------------

export const RedisKeys = {
  /** Global FIFO job queue */
  taskQueue: "queue:tasks",

  /** Hash: job metadata and lifecycle status — TTL 24 h */
  jobStatus: (jobId: string) => `job:${jobId}:status`,

  /** Pub/Sub channel: real-time streaming logs per job */
  logChannel: (jobId: string) => `channel:logs:${jobId}`,

  /** Hash: short-term conversation memory — TTL 12 h */
  sessionMemory: (sessionId: string) => `session:${sessionId}:memory`,

  /** String (NX): distributed mutex for job claiming — TTL 30 s */
  jobLock: (jobId: string) => `lock:job:${jobId}`,
} as const;

export const TTL = {
  /** Job status and metadata: 24 hours */
  JOB_STATUS: 86_400,
  /** Session memory: 12 hours */
  SESSION_MEMORY: 43_200,
  /** Job lock (auto-release on worker crash): 30 seconds */
  JOB_LOCK: 30,
  /** Maximum conversation turns kept in short-term memory */
  MAX_MEMORY_TURNS: 10,
} as const;
