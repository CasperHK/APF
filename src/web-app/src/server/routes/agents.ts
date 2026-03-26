/**
 * Elysia route module — Agent management endpoints.
 * Validates all I/O with ArkType schemas (Single Source of Truth).
 */
import Elysia, { t } from "elysia";
import type { Agent } from "@shared/schemas";

/** In-memory store — replace with DB/Redis in production */
const agentsStore = new Map<string, Agent>([
  [
    "ogilvy-copywriter",
    {
      id: "ogilvy-copywriter",
      name: "Ogilvy Copywriter",
      role: "Brand Copywriter",
      model: "claude-opus-4.6",
      status: "idle",
      avatar: "✍️",
      description:
        "Crafts compelling ad copy in the style of David Ogilvy. Focuses on truth, research, and long-form persuasion.",
      tags: ["copywriting", "brand", "advertising"],
    },
  ],
  [
    "growth-hacker",
    {
      id: "growth-hacker",
      name: "Growth Hacker",
      role: "Silicon Valley Growth Strategist",
      model: "deepseek-v3",
      status: "idle",
      avatar: "🚀",
      description:
        "Data-driven first-principles thinker. Identifies growth loops, viral mechanics, and PMF levers.",
      tags: ["growth", "strategy", "product"],
    },
  ],
  [
    "seo-specialist",
    {
      id: "seo-specialist",
      name: "SEO Specialist",
      role: "Traffic & Search Expert",
      model: "claude-3.5-sonnet",
      status: "idle",
      avatar: "🔍",
      description:
        "Masters keyword clustering, SERP analysis, and content strategy to drive organic traffic at scale.",
      tags: ["SEO", "content", "traffic"],
    },
  ],
  [
    "xiaohongshu-expert",
    {
      id: "xiaohongshu-expert",
      name: "小紅書 Viral Expert",
      role: "Chinese Social Media Strategist",
      model: "deepseek-v3",
      status: "idle",
      avatar: "📱",
      description:
        "Understands Xiaohongshu algorithms and crafts viral content hooks for the Chinese social commerce market.",
      tags: ["social", "viral", "China"],
    },
  ],
]);

export const agentsRoutes = new Elysia({ prefix: "/agents" })
  .get("/", () => Array.from(agentsStore.values()), {
    detail: { summary: "List all agents" },
  })
  .get("/:id", ({ params, error }) => {
    const agent = agentsStore.get(params.id);
    if (!agent) return error(404, { message: "Agent not found" });
    return agent;
  })
  .post(
    "/",
    ({ body }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const agent: Agent = {
        id,
        name: body.name,
        role: body.role,
        model: body.model,
        status: "idle",
        avatar: body.avatar,
        description: body.description,
        tags: body.tags ?? [],
      };
      agentsStore.set(id, agent);
      return agent;
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        role: t.String({ minLength: 1 }),
        model: t.String({ minLength: 1 }),
        avatar: t.Optional(t.String()),
        description: t.Optional(t.String()),
        tags: t.Optional(t.Array(t.String())),
      }),
      detail: { summary: "Create a new agent" },
    }
  )
  .patch(
    "/:id/status",
    ({ params, body, error }) => {
      const agent = agentsStore.get(params.id);
      if (!agent) return error(404, { message: "Agent not found" });
      const updated = { ...agent, status: body.status };
      agentsStore.set(params.id, updated);
      return updated;
    },
    {
      body: t.Object({
        status: t.Union([
          t.Literal("idle"),
          t.Literal("thinking"),
          t.Literal("executing"),
          t.Literal("done"),
          t.Literal("error"),
        ]),
      }),
      detail: { summary: "Update agent status" },
    }
  )
  .delete("/:id", ({ params, error }) => {
    if (!agentsStore.has(params.id)) return error(404, { message: "Agent not found" });
    agentsStore.delete(params.id);
    return { success: true };
  });
