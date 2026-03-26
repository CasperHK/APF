/**
 * @module schemas
 * Single Source of Truth — all data shapes for APF.
 * Both the Elysia server routes and the SolidStart frontend
 * import from this file, guaranteeing front-to-back type safety.
 */
import { type } from "arktype";

// ── Agent ──────────────────────────────────────────────────────────────────

export const AgentStatusSchema = type('"idle" | "thinking" | "executing" | "done" | "error"');
export type AgentStatus = typeof AgentStatusSchema.infer;

export const AgentSchema = type({
  id: "string",
  name: "string",
  role: "string",
  model: "string",
  status: AgentStatusSchema,
  "avatar?": "string",
  "description?": "string",
  tags: "string[]",
});
export type Agent = typeof AgentSchema.infer;

export const CreateAgentSchema = type({
  name: "string > 0",
  role: "string > 0",
  model: "string > 0",
  "avatar?": "string",
  "description?": "string",
  "tags?": "string[]",
});
export type CreateAgentInput = typeof CreateAgentSchema.infer;

// ── Workspace ──────────────────────────────────────────────────────────────

export const WorkspaceFileSchema = type({
  name: "string",
  path: "string",
  type: '"file" | "directory"',
  "size?": "number",
  updatedAt: "string",
});
export type WorkspaceFile = typeof WorkspaceFileSchema.infer;

// ── Chat / War Room ────────────────────────────────────────────────────────

export const MessageTypeSchema = type('"message" | "log" | "tool_call" | "result"');
export type MessageType = typeof MessageTypeSchema.infer;

export const ChatMessageSchema = type({
  id: "string",
  agentId: "string",
  agentName: "string",
  content: "string",
  timestamp: "string",
  type: MessageTypeSchema,
});
export type ChatMessage = typeof ChatMessageSchema.infer;

export const SendMessageSchema = type({
  roomId: "string",
  content: "string",
  "type?": MessageTypeSchema,
});
export type SendMessageInput = typeof SendMessageSchema.infer;

// ── War Room Session ───────────────────────────────────────────────────────

export const WarRoomSchema = type({
  id: "string",
  name: "string",
  agentIds: "string[]",
  status: '"active" | "idle" | "completed"',
  createdAt: "string",
});
export type WarRoom = typeof WarRoomSchema.infer;

// ── Auth ───────────────────────────────────────────────────────────────────

export const LoginSchema = type({
  email: "string.email",
  password: "string >= 8",
});
export type LoginInput = typeof LoginSchema.infer;

export const UserSchema = type({
  id: "string",
  name: "string",
  email: "string",
  "avatar?": "string",
  plan: '"free" | "pro" | "enterprise"',
});
export type User = typeof UserSchema.infer;
