import Redis from "ioredis";
import {
  JobMessage,
  JobStatusRecord,
  LogMessage,
  SessionMemory,
  ConversationTurn,
  RedisKeys,
  TTL,
  ArkErrors,
  type JobStatus,
} from "../../shared/types";

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

/** Shared ioredis instance for commands */
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

/**
 * Create a dedicated subscriber connection.
 * ioredis requires a separate client when using SUBSCRIBE/PSUBSCRIBE.
 */
function createSubscriber(): Redis {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // retry forever for subscriptions
    enableReadyCheck: true,
    lazyConnect: false,
  });
}

redis.on("error", (err) => {
  console.error("[Redis] Connection error:", err);
});

// ---------------------------------------------------------------------------
// Task Queue
// ---------------------------------------------------------------------------

/**
 * Push a new job onto the task queue.
 *
 * Flow:
 *  1. Validates the payload with ArkType.
 *  2. Serialises to JSON and LPUSHes onto `queue:tasks`.
 *  3. Creates the initial `job:{id}:status` Hash with PENDING status + 24 h TTL.
 *
 * @returns The queue length after the push.
 */
export async function pushJob(raw: unknown): Promise<number> {
  const result = JobMessage(raw);
  if (result instanceof ArkErrors) {
    throw new Error(`Invalid JobMessage: ${result.summary}`);
  }
  const job = result;

  const now = new Date().toISOString();

  const initialStatus: Record<string, string> = {
    job_id: job.job_id,
    session_id: job.session_id,
    persona_id: job.persona_id,
    status: "PENDING" satisfies JobStatus,
    created_at: now,
  };

  const pipeline = redis.pipeline();
  // Enqueue the job
  pipeline.lpush(RedisKeys.taskQueue, JSON.stringify(job));
  // Create status hash
  pipeline.hset(RedisKeys.jobStatus(job.job_id), initialStatus);
  // Set TTL on status hash
  pipeline.expire(RedisKeys.jobStatus(job.job_id), TTL.JOB_STATUS);

  const results = await pipeline.exec();
  if (!results) throw new Error("Redis pipeline returned null");

  // First result is the LPUSH queue length
  const queueLen = results[0]?.[1] as number;
  return queueLen;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve the current status record for a job.
 */
export async function getJobStatus(jobId: string): Promise<JobStatusRecord | null> {
  const raw = await redis.hgetall(RedisKeys.jobStatus(jobId));
  if (!raw || Object.keys(raw).length === 0) return null;

  const result = JobStatusRecord({
    ...raw,
    // turn_count and context_turns come back as strings from Redis
    status: raw.status,
  });
  if (result instanceof ArkErrors) {
    throw new Error(`Malformed job status for ${jobId}: ${result.summary}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Pub/Sub — Streaming Logs
// ---------------------------------------------------------------------------

/**
 * Subscribe to the real-time log channel for a specific job.
 *
 * Calls `onMessage` for every validated `LogMessage` received.
 * Calls `onError` if a message fails validation.
 * Returns an `unsubscribe` function to clean up the connection.
 *
 * @example
 * ```ts
 * const unsub = await subscribeToLogs(jobId, (msg) => {
 *   ws.send(JSON.stringify({ event: "log", job_id: msg.job_id, data: msg }));
 * });
 * // later…
 * await unsub();
 * ```
 */
export async function subscribeToLogs(
  jobId: string,
  onMessage: (msg: LogMessage) => void,
  onError?: (err: Error) => void
): Promise<() => Promise<void>> {
  const subscriber = createSubscriber();
  const channel = RedisKeys.logChannel(jobId);

  await subscriber.subscribe(channel);

  subscriber.on("message", (_channel: string, raw: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      onError?.(new Error(`Non-JSON message on ${channel}: ${raw}`));
      return;
    }

    const result = LogMessage(parsed);
    if (result instanceof ArkErrors) {
      onError?.(new Error(`Invalid LogMessage: ${result.summary}`));
      return;
    }

    onMessage(result);
  });

  subscriber.on("error", (err: Error) => {
    onError?.(err);
  });

  return async () => {
    await subscriber.unsubscribe(channel);
    subscriber.disconnect();
  };
}

/**
 * Publish a log message to the job's log channel (primarily for testing).
 */
export async function publishLog(msg: unknown): Promise<number> {
  const result = LogMessage(msg);
  if (result instanceof ArkErrors) {
    throw new Error(`Invalid LogMessage: ${result.summary}`);
  }
  return redis.publish(RedisKeys.logChannel(result.job_id), JSON.stringify(result));
}

// ---------------------------------------------------------------------------
// Session Memory
// ---------------------------------------------------------------------------

/**
 * Read the short-term conversation memory for a session.
 * Resets the 12-hour sliding TTL on each read.
 */
export async function getSessionMemory(sessionId: string): Promise<SessionMemory | null> {
  const key = RedisKeys.sessionMemory(sessionId);
  const raw = await redis.hgetall(key);
  if (!raw || Object.keys(raw).length === 0) return null;

  // Reset sliding TTL
  await redis.expire(key, TTL.SESSION_MEMORY);

  const turns: ConversationTurn[] = JSON.parse(raw.turns ?? "[]");
  const result = SessionMemory({
    ...raw,
    turns,
    turn_count: Number(raw.turn_count ?? 0),
  });
  if (result instanceof ArkErrors) {
    throw new Error(`Malformed session memory for ${sessionId}: ${result.summary}`);
  }
  return result;
}

/**
 * Append a new turn to the session memory, capping at `TTL.MAX_MEMORY_TURNS`.
 * Resets the 12-hour sliding TTL.
 */
export async function appendSessionTurn(
  sessionId: string,
  turn: unknown
): Promise<void> {
  const result = ConversationTurn(turn);
  if (result instanceof ArkErrors) {
    throw new Error(`Invalid ConversationTurn: ${result.summary}`);
  }

  const key = RedisKeys.sessionMemory(sessionId);
  const raw = await redis.hgetall(key);

  const existing: ConversationTurn[] = raw?.turns ? JSON.parse(raw.turns) : [];
  existing.push(result);

  // Keep only the last MAX_MEMORY_TURNS turns
  const trimmed = existing.slice(-TTL.MAX_MEMORY_TURNS);

  const turnCount = Number(raw?.turn_count ?? 0) + 1;
  const now = new Date().toISOString();

  const pipeline = redis.pipeline();
  pipeline.hset(key, {
    turns: JSON.stringify(trimmed),
    turn_count: String(turnCount),
    last_active: now,
  });
  pipeline.expire(key, TTL.SESSION_MEMORY);
  await pipeline.exec();
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}
