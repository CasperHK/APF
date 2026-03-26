/**
 * Main Elysia application — single container API server.
 *
 * This module is imported by the SolidStart catch-all API route
 * (`src/routes/api/[...].ts`), co-locating the API server and
 * the frontend SSR server in one Bun process (single container).
 *
 * Contract-First flow:
 *   1. Edit schemas in `src/shared/schemas.ts` (ArkType)
 *   2. Update route handlers here / in `src/server/routes/`
 *   3. Eden Treaty auto-infers types on the frontend
 */
import { Elysia } from "elysia";
import { agentsRoutes } from "./routes/agents";
import { workspaceRoutes } from "./routes/workspace";
import { warRoomRoutes } from "./routes/warRoom";

export const api = new Elysia({ prefix: "/api" })
  .use(agentsRoutes)
  .use(workspaceRoutes)
  .use(warRoomRoutes)
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }), {
    detail: { summary: "Health check" },
  });

/** Type exported for Eden Treaty — frontend consumes `treaty<App>()` */
export type App = typeof api;
