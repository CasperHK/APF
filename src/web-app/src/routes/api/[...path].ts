/**
 * SolidStart catch-all route that delegates all `/api/*` requests
 * to the Elysia application, enabling a true single-container
 * deployment (one Bun process serves both SSR and the REST/WS API).
 */
import { api } from "~/server/api";

export const GET = async ({ request }: { request: Request }) =>
  api.handle(request);

export const POST = async ({ request }: { request: Request }) =>
  api.handle(request);

export const PATCH = async ({ request }: { request: Request }) =>
  api.handle(request);

export const DELETE = async ({ request }: { request: Request }) =>
  api.handle(request);
