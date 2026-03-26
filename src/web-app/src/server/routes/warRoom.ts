/**
 * Elysia route module — War Room sessions & WebSocket hub.
 */
import Elysia, { t } from "elysia";
import type { ChatMessage, WarRoom } from "@shared/schemas";

const rooms = new Map<string, WarRoom>([
  [
    "marketing-war-room",
    {
      id: "marketing-war-room",
      name: "Marketing Strategy Session",
      agentIds: ["ogilvy-copywriter", "growth-hacker", "seo-specialist"],
      status: "active",
      createdAt: new Date().toISOString(),
    },
  ],
]);

const roomMessages = new Map<string, ChatMessage[]>([
  [
    "marketing-war-room",
    [
      {
        id: "1",
        agentId: "ogilvy-copywriter",
        agentName: "Ogilvy Copywriter",
        content:
          "I've reviewed the brand brief. The headline needs to lead with a concrete benefit, not a clever pun. Research shows direct headlines outperform clever ones 4-to-1.",
        timestamp: new Date(Date.now() - 120000).toISOString(),
        type: "message",
      },
      {
        id: "2",
        agentId: "growth-hacker",
        agentName: "Growth Hacker",
        content:
          "Disagree. A/B test data from Product Hunt launches shows curiosity-gap headlines drive 2.3× more clicks in the tech audience segment we're targeting.",
        timestamp: new Date(Date.now() - 90000).toISOString(),
        type: "message",
      },
      {
        id: "3",
        agentId: "seo-specialist",
        agentName: "SEO Specialist",
        content: "Running SERP analysis for target keywords…",
        timestamp: new Date(Date.now() - 60000).toISOString(),
        type: "tool_call",
      },
      {
        id: "4",
        agentId: "seo-specialist",
        agentName: "SEO Specialist",
        content:
          "Top 3 ranking pages use direct benefit-focused H1 tags. 'AI content tool' — 12K monthly searches. Recommend: combine benefit clarity + keyword targeting.",
        timestamp: new Date(Date.now() - 30000).toISOString(),
        type: "result",
      },
    ],
  ],
]);

export const warRoomRoutes = new Elysia({ prefix: "/war-room" })
  .get("/rooms", () => Array.from(rooms.values()), {
    detail: { summary: "List war rooms" },
  })
  .get("/rooms/:id", ({ params, error }) => {
    const room = rooms.get(params.id);
    if (!room) return error(404, { message: "Room not found" });
    return room;
  })
  .get("/rooms/:id/messages", ({ params, error }) => {
    if (!rooms.has(params.id)) return error(404, { message: "Room not found" });
    return roomMessages.get(params.id) ?? [];
  })
  .post(
    "/rooms/:id/messages",
    ({ params, body, error }) => {
      if (!rooms.has(params.id)) return error(404, { message: "Room not found" });
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        agentId: body.agentId,
        agentName: body.agentName,
        content: body.content,
        timestamp: new Date().toISOString(),
        type: body.type ?? "message",
      };
      const msgs = roomMessages.get(params.id) ?? [];
      msgs.push(msg);
      roomMessages.set(params.id, msgs);
      return msg;
    },
    {
      body: t.Object({
        agentId: t.String(),
        agentName: t.String(),
        content: t.String({ minLength: 1 }),
        type: t.Optional(
          t.Union([
            t.Literal("message"),
            t.Literal("log"),
            t.Literal("tool_call"),
            t.Literal("result"),
          ])
        ),
      }),
      detail: { summary: "Post a message to a war room" },
    }
  )
  .ws("/ws", {
    /** WebSocket hub for real-time agent log streaming and human-in-the-loop */
    open(ws) {
      const roomId = (ws.data.query as { room?: string }).room ?? "global";
      ws.subscribe(roomId);
      ws.send(JSON.stringify({ type: "connected", roomId }));
    },
    message(ws, rawMsg) {
      try {
        const msg = JSON.parse(rawMsg as string) as {
          type: string;
          content?: string;
          room?: string;
        };
        const roomId = msg.room ?? "global";
        const broadcast: ChatMessage = {
          id: crypto.randomUUID(),
          agentId: "human",
          agentName: "You (Human-in-the-Loop)",
          content: msg.content ?? "",
          timestamp: new Date().toISOString(),
          type: "message",
        };
        ws.publish(roomId, JSON.stringify(broadcast));
      } catch {
        // ignore malformed messages
      }
    },
    close(ws) {
      ws.unsubscribe((ws.data.query as { room?: string }).room ?? "global");
    },
  });
