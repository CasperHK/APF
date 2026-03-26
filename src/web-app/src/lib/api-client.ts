/**
 * Eden Treaty client — end-to-end type-safe API calls.
 * The `App` type is exported from the Elysia server, so any
 * change to a route is immediately reflected here as a type error.
 */
import { treaty } from "@elysiajs/eden";
import type { App } from "~/server/api";

/**
 * In a single-container setup the API lives on the same origin,
 * so we use an empty string as the base URL (same-origin requests).
 * Override `VITE_API_URL` for local cross-origin development.
 */
const API_BASE =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? (import.meta.env.VITE_API_URL as string)
    : "";

export const api = treaty<App>(API_BASE);
