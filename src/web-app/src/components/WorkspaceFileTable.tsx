/**
 * WorkspaceFileTable — secure workspace file browser.
 */
import { Component, For } from "solid-js";
import type { WorkspaceFile } from "@shared/schemas";

interface WorkspaceFileTableProps {
  files: WorkspaceFile[];
  selectedPath?: string | null;
  onSelect?: (path: string) => void;
  onDownload?: (path: string) => void;
}

const fileIcon = (file: WorkspaceFile): string => {
  if (file.type === "directory") return "📂";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const icons: Record<string, string> = {
    pdf: "📕", docx: "📘", md: "📝", csv: "📊",
    png: "🖼️", jpg: "🖼️", py: "🐍", json: "📋", txt: "📄",
  };
  return icons[ext] ?? "📄";
};

const formatSize = (bytes?: number): string => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

const WorkspaceFileTable: Component<WorkspaceFileTableProps> = (props) => {
  return (
    <div class="glass-card overflow-hidden">
      <table class="w-full text-sm text-left">
        <thead>
          <tr class="border-b border-white/10 bg-white/[0.03]">
            {["Name", "Type", "Size", "Modified", ""].map((h) => (
              <th class="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          <For each={props.files}>
            {(file) => (
              <tr
                class={`futuristic-table-row cursor-pointer transition-colors ${props.selectedPath === file.path ? "bg-neon-violet/5" : ""}`}
                onClick={() => props.onSelect?.(file.path)}
              >
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2.5">
                    <span class="text-base">{fileIcon(file)}</span>
                    <span class={`font-medium ${file.type === "directory" ? "text-neon-cyan" : "text-gray-200"}`}>
                      {file.name}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class={`px-2 py-0.5 text-xs font-medium rounded-full ${file.type === "directory" ? "text-neon-cyan bg-neon-cyan/10" : "text-neon-violet bg-neon-violet/10"}`}>
                    {file.type}
                  </span>
                </td>
                <td class="px-4 py-3 text-xs text-gray-500 font-mono">{formatSize(file.size)}</td>
                <td class="px-4 py-3 text-xs text-gray-500">{formatDate(file.updatedAt)}</td>
                <td class="px-4 py-3">
                  <button
                    class="text-xs text-gray-500 hover:text-neon-cyan transition-colors"
                    onClick={(e) => { e.stopPropagation(); props.onDownload?.(file.path); }}
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
  );
};

export default WorkspaceFileTable;
