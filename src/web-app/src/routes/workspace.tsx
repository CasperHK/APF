import { Title } from "@solidjs/meta";
import { Component, createSignal } from "solid-js";
import DashboardLayout from "@layouts/DashboardLayout";
import WorkspaceFileTable from "@components/WorkspaceFileTable";
import Button from "@components/ui/Button";
import type { WorkspaceFile } from "@shared/schemas";

const DEMO_FILES: WorkspaceFile[] = [
  { name: "brand-manual.pdf",   path: "/secure_workspace/brand-manual.pdf",   type: "file",      size: 2048000, updatedAt: new Date(Date.now() - 3600000).toISOString() },
  { name: "product-spec.docx",  path: "/secure_workspace/product-spec.docx",  type: "file",      size: 512000,  updatedAt: new Date(Date.now() - 7200000).toISOString() },
  { name: "Social_Post_v1.md",  path: "/secure_workspace/Social_Post_v1.md",  type: "file",      size: 4096,    updatedAt: new Date(Date.now() - 1800000).toISOString() },
  { name: "analysis",           path: "/secure_workspace/analysis",           type: "directory",             updatedAt: new Date(Date.now() - 900000).toISOString()  },
  { name: "traffic-report.csv", path: "/secure_workspace/traffic-report.csv", type: "file",      size: 153600,  updatedAt: new Date(Date.now() - 600000).toISOString()  },
  { name: "chart_output.png",   path: "/secure_workspace/chart_output.png",   type: "file",      size: 98304,   updatedAt: new Date(Date.now() - 300000).toISOString()  },
];

const Workspace: Component = () => {
  const [files] = createSignal<WorkspaceFile[]>(DEMO_FILES);
  const [selected, setSelected] = createSignal<string | null>(null);
  const [dragOver, setDragOver] = createSignal(false);

  const handleUpload = () => {
    alert("Upload dialog — POST to /api/workspace/files");
  };

  const handleDownload = (path: string) => {
    alert(`Download: ${path}`);
  };

  return (
    <DashboardLayout>
      <Title>Workspace — APF</Title>

      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-white mb-1">📁 Secure Workspace</h1>
          <p class="text-sm text-gray-400">
            <code class="text-neon-cyan text-xs">/secure_workspace</code>
            {" "}· Isolated sandboxed file system for agent I/O
          </p>
        </div>
        <Button size="sm" onClick={handleUpload}>
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Upload Files
        </Button>
      </div>

      {/* Usage bar */}
      <div class="glass-card p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="flex-1">
          <div class="flex justify-between text-xs text-gray-400 mb-1">
            <span>Storage Used</span>
            <span class="text-neon-cyan font-medium">2.8 MB / 100 MB</span>
          </div>
          <div class="w-full bg-dark-700 rounded-full h-2">
            <div class="bg-gradient-to-r from-neon-cyan to-neon-violet h-2 rounded-full" style="width: 2.8%" />
          </div>
        </div>
        <div class="flex items-center gap-4 text-xs text-gray-500">
          <span><span class="text-white font-medium">5</span> files</span>
          <span><span class="text-white font-medium">1</span> folder</span>
          <span><span class="text-neon-emerald font-medium">0</span> running</span>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        class={`border-2 border-dashed rounded-xl p-6 text-center mb-4 transition-all duration-200 cursor-pointer ${dragOver() ? "border-neon-cyan bg-neon-cyan/5" : "border-white/10 hover:border-neon-violet/40 hover:bg-white/[0.02]"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(); }}
        onClick={handleUpload}
      >
        <div class="text-3xl mb-2">{dragOver() ? "📂" : "⬆️"}</div>
        <p class="text-sm text-gray-400">
          {dragOver() ? "Drop files here" : "Drag & drop files, or click to upload"}
        </p>
        <p class="text-xs text-gray-600 mt-1">PDF, DOCX, CSV, MD, PNG — max 50 MB each</p>
      </div>

      {/* File Table */}
      <WorkspaceFileTable
        files={files()}
        selectedPath={selected()}
        onSelect={(path) => setSelected(selected() === path ? null : path)}
        onDownload={handleDownload}
      />

      {/* Security notice */}
      <div class="mt-4 p-4 rounded-xl bg-neon-amber/5 border border-neon-amber/20 flex items-start gap-3">
        <span class="text-lg">🔒</span>
        <div>
          <p class="text-sm font-medium text-neon-amber">Sandboxed Environment</p>
          <p class="text-xs text-gray-400 mt-0.5">
            All agent file I/O is restricted to this workspace volume. Operations are audit-logged via MCP.
            Agents cannot access the host filesystem outside <code class="text-neon-cyan">/secure_workspace</code>.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Workspace;
