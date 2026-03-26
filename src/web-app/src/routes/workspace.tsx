import { Title } from "@solidjs/meta";
import { createSignal, For, Show } from "solid-js";
import { Sidebar } from "~/components/Sidebar";
import type { WorkspaceFile } from "~/lib/api-types";

const DEMO_FILES: WorkspaceFile[] = [
  { name: "brand-manual.pdf",     path: "/secure_workspace/brand-manual.pdf",     type: "file",      size: 2048000,  updatedAt: new Date(Date.now() - 3600000).toISOString() },
  { name: "product-spec.docx",    path: "/secure_workspace/product-spec.docx",    type: "file",      size: 512000,   updatedAt: new Date(Date.now() - 7200000).toISOString() },
  { name: "Social_Post_v1.md",    path: "/secure_workspace/Social_Post_v1.md",    type: "file",      size: 4096,     updatedAt: new Date(Date.now() - 1800000).toISOString() },
  { name: "analysis",             path: "/secure_workspace/analysis",             type: "directory",              updatedAt: new Date(Date.now() - 900000).toISOString() },
  { name: "traffic-report.csv",   path: "/secure_workspace/traffic-report.csv",   type: "file",      size: 153600,   updatedAt: new Date(Date.now() - 600000).toISOString() },
  { name: "chart_output.png",     path: "/secure_workspace/chart_output.png",     type: "file",      size: 98304,    updatedAt: new Date(Date.now() - 300000).toISOString() },
];

function fileIcon(file: WorkspaceFile): string {
  if (file.type === "directory") return "📂";
  const ext = file.name.split(".").pop()?.toLowerCase();
  const icons: Record<string, string> = {
    pdf: "📕", docx: "📘", md: "📝", csv: "📊", png: "🖼️", jpg: "🖼️", py: "🐍", json: "📋",
  };
  return icons[ext ?? ""] ?? "📄";
}

function formatSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function Workspace() {
  const [files] = createSignal<WorkspaceFile[]>(DEMO_FILES);
  const [selected, setSelected] = createSignal<string | null>(null);
  const [uploadHover, setUploadHover] = createSignal(false);

  const handleUpload = () => {
    // In production this would open a file picker and POST to the api-server
    alert("File upload will POST to /api/workspace/upload");
  };

  return (
    <>
      <Title>Workspace · APF</Title>
      <div style={{ display: "flex", "min-height": "100vh" }}>
        <Sidebar />
        <main style={{ flex: 1, padding: "2rem", overflow: "auto" }}>
          {/* Header */}
          <div style={{ display: "flex", "align-items": "center", "justify-content": "space-between", "margin-bottom": "2rem" }}>
            <div>
              <h1 style={{ margin: 0, "font-size": "1.75rem", "font-weight": "700" }}>📁 Secure Workspace</h1>
              <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)" }}>
                <code style={{ "font-size": "0.8125rem", color: "#67e8f9" }}>/secure_workspace</code> · Isolated agent file system
              </p>
            </div>
            <button class="btn-primary" onClick={handleUpload}>
              ⬆️ Upload Files
            </button>
          </div>

          {/* Drop Zone */}
          <div
            onMouseEnter={() => setUploadHover(true)}
            onMouseLeave={() => setUploadHover(false)}
            style={{
              border: `2px dashed ${uploadHover() ? "var(--primary)" : "var(--border)"}`,
              "border-radius": "0.75rem",
              padding: "1.5rem",
              "text-align": "center",
              "margin-bottom": "1.5rem",
              transition: "border-color 0.2s",
              cursor: "pointer",
              background: uploadHover() ? "rgba(124,58,237,0.05)" : "transparent",
            }}
            onClick={handleUpload}
          >
            <p style={{ margin: 0, color: "var(--text-muted)", "font-size": "0.875rem" }}>
              Drag & drop files here, or click to upload to the secure workspace
            </p>
          </div>

          {/* File Table */}
          <div class="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", "border-collapse": "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-card)", "border-bottom": "1px solid var(--border)" }}>
                  {["Name", "Type", "Size", "Modified", "Actions"].map((h) => (
                    <th style={{ padding: "0.875rem 1rem", "text-align": "left", "font-size": "0.8125rem", "font-weight": "600", color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <For each={files()}>
                  {(file) => (
                    <tr
                      style={{
                        "border-bottom": "1px solid var(--border)",
                        background: selected() === file.path ? "rgba(124,58,237,0.08)" : "transparent",
                        cursor: "pointer",
                        transition: "background 0.1s",
                      }}
                      onClick={() => setSelected(file.path === selected() ? null : file.path)}
                    >
                      <td style={{ padding: "0.875rem 1rem", display: "flex", "align-items": "center", gap: "0.5rem" }}>
                        <span>{fileIcon(file)}</span>
                        <span style={{ "font-weight": file.type === "directory" ? "600" : "400" }}>{file.name}</span>
                      </td>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <span class={`badge ${file.type === "directory" ? "badge-cyan" : "badge-purple"}`}>
                          {file.type}
                        </span>
                      </td>
                      <td style={{ padding: "0.875rem 1rem", "font-size": "0.8125rem", color: "var(--text-muted)" }}>
                        {formatSize(file.size)}
                      </td>
                      <td style={{ padding: "0.875rem 1rem", "font-size": "0.8125rem", color: "var(--text-muted)" }}>
                        {formatDate(file.updatedAt)}
                      </td>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <button
                          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", "font-size": "0.8125rem" }}
                          onClick={(e) => { e.stopPropagation(); alert(`Download: ${file.path}`); }}
                        >
                          ⬇ Download
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>

          {/* Security Notice */}
          <div style={{ "margin-top": "1.5rem", padding: "1rem", background: "#1c1917", "border-radius": "0.5rem", border: "1px solid #78350f" }}>
            <p style={{ margin: 0, "font-size": "0.8125rem", color: "#fcd34d" }}>
              🔒 <strong>Sandboxed Environment</strong> — All agent file I/O is restricted to this workspace. Operations are audit-logged. Agents cannot access the host filesystem.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
