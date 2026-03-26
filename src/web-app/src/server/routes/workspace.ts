/**
 * Elysia route module — Secure workspace file management.
 */
import Elysia, { t } from "elysia";
import type { WorkspaceFile } from "@shared/schemas";

/** Demo workspace files — replace with real FS operations */
const workspaceFiles: WorkspaceFile[] = [
  { name: "brand-manual.pdf",   path: "/secure_workspace/brand-manual.pdf",   type: "file",      size: 2048000, updatedAt: new Date(Date.now() - 3600000).toISOString() },
  { name: "product-spec.docx",  path: "/secure_workspace/product-spec.docx",  type: "file",      size: 512000,  updatedAt: new Date(Date.now() - 7200000).toISOString() },
  { name: "Social_Post_v1.md",  path: "/secure_workspace/Social_Post_v1.md",  type: "file",      size: 4096,    updatedAt: new Date(Date.now() - 1800000).toISOString() },
  { name: "analysis",           path: "/secure_workspace/analysis",           type: "directory",             updatedAt: new Date(Date.now() - 900000).toISOString()  },
  { name: "traffic-report.csv", path: "/secure_workspace/traffic-report.csv", type: "file",      size: 153600,  updatedAt: new Date(Date.now() - 600000).toISOString()  },
  { name: "chart_output.png",   path: "/secure_workspace/chart_output.png",   type: "file",      size: 98304,   updatedAt: new Date(Date.now() - 300000).toISOString()  },
];

export const workspaceRoutes = new Elysia({ prefix: "/workspace" })
  .get("/files", () => workspaceFiles, {
    detail: { summary: "List workspace files" },
  })
  .get("/files/:name", ({ params, error }) => {
    const file = workspaceFiles.find((f) => f.name === params.name);
    if (!file) return error(404, { message: "File not found" });
    return file;
  })
  .post(
    "/files",
    ({ body }) => {
      const file: WorkspaceFile = {
        name: body.name,
        path: `/secure_workspace/${body.name}`,
        type: "file",
        size: 0,
        updatedAt: new Date().toISOString(),
      };
      workspaceFiles.push(file);
      return file;
    },
    {
      body: t.Object({ name: t.String({ minLength: 1 }) }),
      detail: { summary: "Register a new workspace file" },
    }
  )
  .delete("/files/:name", ({ params, error }) => {
    const idx = workspaceFiles.findIndex((f) => f.name === params.name);
    if (idx === -1) return error(404, { message: "File not found" });
    workspaceFiles.splice(idx, 1);
    return { success: true };
  });
