import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { createSignal, For } from "solid-js";
import { Sidebar } from "~/components/Sidebar";
import { AgentCard } from "~/components/AgentCard";
import type { Agent } from "~/lib/api-types";

const DEMO_AGENTS: Agent[] = [
  {
    id: "ogilvy-copywriter",
    name: "Ogilvy Copywriter",
    role: "Brand Copywriter",
    model: "claude-opus-4.6",
    status: "idle",
    avatar: "✍️",
    description: "Crafts compelling ad copy in the style of David Ogilvy. Focuses on truth, research, and long-form persuasion.",
    tags: ["copywriting", "brand", "advertising"],
  },
  {
    id: "growth-hacker",
    name: "Growth Hacker",
    role: "Silicon Valley Growth Strategist",
    model: "deepseek-v3",
    status: "thinking",
    avatar: "🚀",
    description: "Data-driven first-principles thinker. Identifies growth loops, viral mechanics, and product-market fit levers.",
    tags: ["growth", "strategy", "product"],
  },
  {
    id: "seo-specialist",
    name: "SEO Specialist",
    role: "Traffic & Search Expert",
    model: "claude-3.5-sonnet",
    status: "executing",
    avatar: "🔍",
    description: "Masters keyword clustering, SERP analysis, and content strategy to drive organic traffic at scale.",
    tags: ["SEO", "content", "traffic"],
  },
  {
    id: "xiaohongshu-expert",
    name: "小紅書 Viral Expert",
    role: "Chinese Social Media Strategist",
    model: "deepseek-v3",
    status: "idle",
    avatar: "📱",
    description: "Understands Xiaohongshu algorithms and crafts viral content hooks for the Chinese social commerce market.",
    tags: ["social", "viral", "China"],
  },
];

export default function Dashboard() {
  const [agents, setAgents] = createSignal<Agent[]>(DEMO_AGENTS);
  const [activeCount] = createSignal(DEMO_AGENTS.filter((a) => a.status !== "idle").length);

  return (
    <>
      <Title>Dashboard · APF</Title>
      <div style={{ display: "flex", "min-height": "100vh" }}>
        <Sidebar />
        <main style={{ flex: 1, padding: "2rem", overflow: "auto" }}>
          {/* Header */}
          <div style={{ display: "flex", "align-items": "center", "justify-content": "space-between", "margin-bottom": "2rem" }}>
            <div>
              <h1 style={{ margin: 0, "font-size": "1.75rem", "font-weight": "700" }}>Agent Dashboard</h1>
              <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)" }}>
                Manage your AI persona team
              </p>
            </div>
            <A href="/war-room" class="btn-primary" style={{ "text-decoration": "none" }}>
              ⚔️ Open War Room
            </A>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", "margin-bottom": "2rem" }}>
            {[
              { label: "Total Agents", value: agents().length, color: "#c4b5fd" },
              { label: "Active Now", value: activeCount(), color: "#06b6d4" },
              { label: "Tasks Done", value: 12, color: "#10b981" },
              { label: "War Rooms", value: 2, color: "#f59e0b" },
            ].map((stat) => (
              <div class="card" style={{ "text-align": "center" }}>
                <p style={{ margin: 0, "font-size": "2rem", "font-weight": "700", color: stat.color }}>{stat.value}</p>
                <p style={{ margin: "0.25rem 0 0", "font-size": "0.8125rem", color: "var(--text-muted)" }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Agent Grid */}
          <div style={{ "margin-bottom": "1.25rem" }}>
            <h2 style={{ margin: 0, "font-size": "1.125rem", "font-weight": "600" }}>Your Agents</h2>
          </div>
          <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
            <For each={agents()}>
              {(agent) => (
                <AgentCard
                  agent={agent}
                  onActivate={(id) => console.log("Activate agent", id)}
                />
              )}
            </For>
          </div>
        </main>
      </div>
    </>
  );
}
