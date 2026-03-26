// These types mirror the Elysia backend routes.
// Update when the api-server is implemented.
import type { Elysia } from "elysia";

export type AgentStatus = "idle" | "thinking" | "executing" | "done" | "error";

export interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  status: AgentStatus;
  avatar?: string;
  description?: string;
  tags: string[];
}

export interface WorkspaceFile {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  agentId: string;
  agentName: string;
  content: string;
  timestamp: string;
  type: "message" | "log" | "tool_call" | "result";
}

// Placeholder App type — replace with actual Elysia App instance type
export type App = Elysia<
  "",
  false,
  { decorator: {}; store: {}; derive: {}; resolve: {} },
  { type: {}; error: {} },
  { schema: {}; macro: {}; macroFn: {} },
  {},
  { derive: {}; resolve: {}; schema: {} },
  { derive: {}; resolve: {}; schema: {} }
>;
