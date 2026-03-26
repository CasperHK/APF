# Redis Data Schema — Agentic Persona Factory (APF)

## Overview

This document defines every Redis key pattern, its data type, purpose, and TTL (Time-To-Live) policy used by the APF State Manager. The State Manager bridges the **Bun + Elysia API Server** and the **Python Agent Worker**, handling:

- Asynchronous task queues (List + Pub/Sub)
- Short-term agent conversation memory (Hash)
- Real-time streaming logs (Pub/Sub)
- Task status tracking (Hash)
- Distributed locking (String + SET NX)

---

## 1. Task Queue

### `queue:tasks`

| Property    | Value                        |
|-------------|------------------------------|
| Type        | **List** (FIFO via LPUSH/BRPOP) |
| TTL         | None (persists until consumed) |
| Producer    | Bun API Server               |
| Consumer    | Python Agent Worker          |

**Description:** The primary job queue. The Bun server pushes serialised `JobMessage` JSON strings to the left; Python workers block-pop from the right.

**Operations:**
- `LPUSH queue:tasks <json>` — enqueue a job
- `BRPOP queue:tasks <timeout>` — dequeue (blocking, single consumer claim)

**Example value (JSON string in list):**
```json
{
  "job_id": "job_01J0XYZ",
  "session_id": "sess_abc123",
  "persona_id": "ogilvy-copywriter",
  "task_type": "generate_content",
  "payload": {
    "prompt": "Write a product launch post for...",
    "context_turns": 5
  },
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

## 2. Task Status & Metadata

### `job:{job_id}:status`

| Property | Value               |
|----------|---------------------|
| Type     | **Hash**            |
| TTL      | **86400 s (24 h)**  |
| Writer   | Both (Bun sets PENDING; Python updates state) |

**Fields:**

| Field        | Type     | Description                                |
|--------------|----------|--------------------------------------------|
| `status`     | string   | `PENDING` \| `RUNNING` \| `COMPLETED` \| `FAILED` |
| `job_id`     | string   | Unique job identifier                      |
| `session_id` | string   | Associated session                         |
| `persona_id` | string   | Agent persona used                         |
| `worker_id`  | string   | ID of the Python worker that claimed it    |
| `created_at` | ISO 8601 | When the job was created                   |
| `started_at` | ISO 8601 | When the worker started processing         |
| `finished_at`| ISO 8601 | When the worker finished (success or fail) |
| `error`      | string   | Error message if `status` is `FAILED`      |
| `result`     | JSON str | Serialised output when `status` is `COMPLETED` |

**Operations:**
- `HSET job:{job_id}:status status PENDING ...` — initial creation
- `HSET job:{job_id}:status status RUNNING started_at <ts>` — on claim
- `EXPIRE job:{job_id}:status 86400` — set TTL on creation

---

## 3. Streaming Logs (Pub/Sub)

### `channel:logs:{job_id}`

| Property    | Value            |
|-------------|------------------|
| Type        | **Pub/Sub Channel** |
| TTL         | N/A (ephemeral)  |
| Publisher   | Python Agent Worker |
| Subscriber  | Bun API Server → WebSocket |

**Description:** Real-time log channel for a specific job. The Python worker publishes progress/thought-process messages; the Bun server subscribes and forwards them to the connected browser via WebSocket.

**Message format (JSON string):**
```json
{
  "job_id": "job_01J0XYZ",
  "level": "INFO",
  "source": "ogilvy-copywriter",
  "message": "Analysing brand voice guidelines...",
  "timestamp": "2024-01-15T10:00:05Z"
}
```

**Log levels:** `DEBUG` | `INFO` | `WARN` | `ERROR` | `AGENT_THOUGHT` | `AGENT_ACTION` | `AGENT_RESULT`

---

## 4. Short-term Conversation Memory

### `session:{session_id}:memory`

| Property | Value              |
|----------|--------------------|
| Type     | **Hash**           |
| TTL      | **43200 s (12 h)** |
| Writer   | Both (Bun initialises; Python appends) |

**Description:** Stores the last N turns of conversation for a session, allowing agents to maintain context without querying the Vector DB on every request.

**Fields:**

| Field          | Type     | Description                                    |
|----------------|----------|------------------------------------------------|
| `session_id`   | string   | Unique session identifier                      |
| `persona_id`   | string   | Active agent persona                           |
| `user_id`      | string   | User who owns the session                      |
| `turns`        | JSON str | Array of last N `ConversationTurn` objects     |
| `turn_count`   | integer  | Total turns (including historical)             |
| `created_at`   | ISO 8601 | Session start time                             |
| `last_active`  | ISO 8601 | Last activity timestamp                        |

**`turns` value — array of `ConversationTurn`:**
```json
[
  {
    "role": "user",
    "content": "Write me a product launch headline",
    "timestamp": "2024-01-15T10:00:00Z"
  },
  {
    "role": "assistant",
    "agent_id": "ogilvy-copywriter",
    "content": "\"The One Headline That Sells Itself\"",
    "timestamp": "2024-01-15T10:00:08Z"
  }
]
```

**Operations:**
- `HSET session:{id}:memory turns <json>` — overwrite/update turns window
- `EXPIRE session:{id}:memory 43200` — reset TTL on each access (sliding window)

---

## 5. Distributed Locking

### `lock:job:{job_id}`

| Property | Value                   |
|----------|-------------------------|
| Type     | **String** (SET NX EX)  |
| TTL      | **30 s** (auto-release) |
| Writer   | Python Agent Worker     |

**Description:** Ensures exactly one worker claims a given job. Uses atomic `SET NX EX` to prevent race conditions across multiple workers.

**Value:** The worker's unique ID (e.g., `worker_hostname_pid`)

**Operations:**
- `SET lock:job:{job_id} {worker_id} NX EX 30` — claim (returns OK or nil)
- `DEL lock:job:{job_id}` — release after job completion
- Auto-expires in 30 s if worker crashes before releasing

---

## 6. Summary Table

| Key Pattern                  | Type          | TTL       | Description                          |
|------------------------------|---------------|-----------|--------------------------------------|
| `queue:tasks`                | List          | None      | Global FIFO job queue                |
| `job:{job_id}:status`        | Hash          | 24 h      | Job metadata and lifecycle status    |
| `channel:logs:{job_id}`      | Pub/Sub       | Ephemeral | Real-time streaming logs per job     |
| `session:{id}:memory`        | Hash          | 12 h      | Short-term conversation memory       |
| `lock:job:{job_id}`          | String (NX)   | 30 s      | Distributed mutex for job claiming   |

---

## 7. Architecture Flow

```
User "Run" click
       │
       ▼
[Bun API Server]
  LPUSH queue:tasks <JobMessage>
  HSET job:{id}:status status PENDING
  SUBSCRIBE channel:logs:{job_id}
       │
       │ (via WebSocket to browser)
       │
       ▼
[Python Agent Worker]
  BRPOP queue:tasks
  SET lock:job:{id} {worker_id} NX EX 30   ← atomic claim
  HSET job:{id}:status status RUNNING
  PUBLISH channel:logs:{id} <LogMessage>  ← loop during execution
  HSET job:{id}:status status COMPLETED
  DEL lock:job:{id}
       │
       ▼
[Bun API Server]  ← receives published log messages
  Forwards LogMessage → WebSocket → Browser
```
