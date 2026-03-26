import { Title } from "@solidjs/meta";
import { createSignal, For } from "solid-js";
import { Sidebar } from "~/components/Sidebar";
import type { Agent } from "~/lib/api-types";

const MARKETPLACE_AGENTS: (Agent & { price: string; author: string; downloads: number })[] = [
  {
    id: "jobs-presenter", name: "Jobs Presenter", role: "Product Storyteller", model: "claude-opus-4.6",
    status: "idle", avatar: "🍎", tags: ["presentation", "product", "vision"],
    description: "Channels Steve Jobs' legendary product reveal style. Builds anticipation, delivers 'one more thing' moments.",
    price: "Free", author: "APF Team", downloads: 2341,
  },
  {
    id: "devil-advocate", name: "Devil's Advocate", role: "Contrarian Analyst", model: "deepseek-v3",
    status: "idle", avatar: "😈", tags: ["critical-thinking", "risk", "strategy"],
    description: "Challenges every assumption. Forces the team to stress-test ideas before execution.",
    price: "Free", author: "APF Team", downloads: 1876,
  },
  {
    id: "pr-crisis-expert", name: "PR Crisis Expert", role: "Reputation Manager", model: "claude-3.5-sonnet",
    status: "idle", avatar: "🛡️", tags: ["PR", "crisis", "communications"],
    description: "Manages brand reputation during crises. Drafts rapid-response statements and media talking points.",
    price: "Pro", author: "CommunityPro", downloads: 943,
  },
  {
    id: "data-storyteller", name: "Data Storyteller", role: "Visualization Analyst", model: "claude-3.5-sonnet",
    status: "idle", avatar: "📈", tags: ["data", "visualization", "insights"],
    description: "Transforms raw metrics into compelling narratives. Generates chart descriptions and executive summaries.",
    price: "Free", author: "DataGuild", downloads: 1542,
  },
];

export default function Marketplace() {
  const [search, setSearch] = createSignal("");

  const filtered = () =>
    MARKETPLACE_AGENTS.filter(
      (a) =>
        a.name.toLowerCase().includes(search().toLowerCase()) ||
        a.role.toLowerCase().includes(search().toLowerCase()) ||
        a.tags.some((t) => t.toLowerCase().includes(search().toLowerCase()))
    );

  return (
    <>
      <Title>Marketplace · APF</Title>
      <div style={{ display: "flex", "min-height": "100vh" }}>
        <Sidebar />
        <main style={{ flex: 1, padding: "2rem", overflow: "auto" }}>
          <div style={{ "margin-bottom": "2rem" }}>
            <h1 style={{ margin: 0, "font-size": "1.75rem", "font-weight": "700" }}>🏪 Agent Marketplace</h1>
            <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)" }}>
              Hire star AI agents crafted by the community
            </p>
          </div>

          <input
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            placeholder="🔍 Search agents by name, role, or tag…"
            style={{
              width: "100%", "max-width": "480px", background: "var(--bg-surface)",
              border: "1px solid var(--border)", "border-radius": "0.5rem",
              padding: "0.625rem 1rem", color: "#f1f5f9", "font-size": "0.875rem",
              outline: "none", "margin-bottom": "1.5rem",
            }}
          />

          <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
            <For each={filtered()}>
              {(agent) => (
                <div class="card" style={{ display: "flex", "flex-direction": "column", gap: "0.75rem" }}>
                  <div style={{ display: "flex", "align-items": "flex-start", "justify-content": "space-between" }}>
                    <div style={{ display: "flex", "align-items": "center", gap: "0.75rem" }}>
                      <div style={{
                        width: "2.5rem", height: "2.5rem", "border-radius": "50%",
                        background: "var(--bg-card)", display: "flex",
                        "align-items": "center", "justify-content": "center", "font-size": "1.25rem",
                      }}>
                        {agent.avatar}
                      </div>
                      <div>
                        <p style={{ margin: 0, "font-weight": "600" }}>{agent.name}</p>
                        <p style={{ margin: 0, "font-size": "0.75rem", color: "var(--text-muted)" }}>{agent.role}</p>
                      </div>
                    </div>
                    <span class={`badge ${agent.price === "Free" ? "badge-green" : "badge-yellow"}`}>
                      {agent.price}
                    </span>
                  </div>

                  <p style={{ margin: 0, "font-size": "0.8125rem", color: "var(--text-muted)", "line-height": "1.5" }}>
                    {agent.description}
                  </p>

                  <div style={{ display: "flex", gap: "0.375rem", "flex-wrap": "wrap" }}>
                    <For each={agent.tags}>{(tag) => <span class="badge badge-purple">{tag}</span>}</For>
                  </div>

                  <div style={{ display: "flex", "align-items": "center", "justify-content": "space-between", "margin-top": "auto" }}>
                    <span style={{ "font-size": "0.75rem", color: "var(--text-muted)" }}>
                      by {agent.author} · ⬇️ {agent.downloads.toLocaleString()}
                    </span>
                    <button class="btn-primary" style={{ padding: "0.375rem 0.875rem", "font-size": "0.8125rem" }}>
                      Hire Agent
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </main>
      </div>
    </>
  );
}
