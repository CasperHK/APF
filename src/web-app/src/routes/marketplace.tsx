import { Title } from "@solidjs/meta";
import { Component, createSignal, For } from "solid-js";
import DashboardLayout from "@layouts/DashboardLayout";
import Card from "@components/ui/Card";
import Button from "@components/ui/Button";
import Input from "@components/ui/Input";
import type { Agent } from "@shared/schemas";

interface MarketplaceAgent extends Agent {
  price: "Free" | "Pro";
  author: string;
  downloads: number;
}

const MARKETPLACE_AGENTS: MarketplaceAgent[] = [
  {
    id: "jobs-presenter", name: "Jobs Presenter", role: "Product Storyteller", model: "claude-opus-4.6",
    status: "idle", avatar: "🍎", tags: ["presentation", "product", "vision"],
    description: "Channels Steve Jobs' legendary product reveal style. Builds anticipation and delivers unforgettable 'one more thing' moments.",
    price: "Free", author: "APF Team", downloads: 2341,
  },
  {
    id: "devil-advocate", name: "Devil's Advocate", role: "Contrarian Analyst", model: "deepseek-v3",
    status: "idle", avatar: "😈", tags: ["critical-thinking", "risk", "strategy"],
    description: "Challenges every assumption. Forces the team to stress-test ideas before committing resources.",
    price: "Free", author: "APF Team", downloads: 1876,
  },
  {
    id: "pr-crisis", name: "PR Crisis Expert", role: "Reputation Manager", model: "claude-3.5-sonnet",
    status: "idle", avatar: "🛡️", tags: ["PR", "crisis", "communications"],
    description: "Manages brand reputation during crises. Drafts rapid-response statements and media talking points.",
    price: "Pro", author: "CommunityPro", downloads: 943,
  },
  {
    id: "data-storyteller", name: "Data Storyteller", role: "Visualization Analyst", model: "claude-3.5-sonnet",
    status: "idle", avatar: "📈", tags: ["data", "charts", "insights"],
    description: "Transforms raw metrics into compelling narratives. Generates chart descriptions and executive summaries.",
    price: "Free", author: "DataGuild", downloads: 1542,
  },
  {
    id: "first-principles", name: "First Principles Officer", role: "Strategic Thinker", model: "claude-opus-4.6",
    status: "idle", avatar: "🧠", tags: ["strategy", "innovation", "reasoning"],
    description: "Deconstructs problems to fundamental truths, then rebuilds solutions from the ground up.",
    price: "Pro", author: "APF Team", downloads: 1120,
  },
  {
    id: "headline-specialist", name: "Headline Specialist", role: "Viral Title Engineer", model: "deepseek-v3",
    status: "idle", avatar: "🎯", tags: ["copywriting", "viral", "CTR"],
    description: "A/B tests emotional triggers, curiosity gaps, and power words to craft irresistibly clickable headlines.",
    price: "Free", author: "CopyLab", downloads: 2089,
  },
];

const Marketplace: Component = () => {
  const [search, setSearch] = createSignal("");
  const [filter, setFilter] = createSignal<"all" | "Free" | "Pro">("all");

  const filtered = () =>
    MARKETPLACE_AGENTS.filter((a) => {
      const matchSearch =
        a.name.toLowerCase().includes(search().toLowerCase()) ||
        a.role.toLowerCase().includes(search().toLowerCase()) ||
        a.tags.some((t) => t.toLowerCase().includes(search().toLowerCase()));
      const matchFilter = filter() === "all" || a.price === filter();
      return matchSearch && matchFilter;
    });

  return (
    <DashboardLayout>
      <Title>Marketplace — APF</Title>

      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-white mb-1">🏪 Agent Marketplace</h1>
          <p class="text-sm text-gray-400">Hire star AI agents crafted by the APF community</p>
        </div>
        <Button size="sm">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Publish Agent
        </Button>
      </div>

      {/* Search + Filter */}
      <div class="flex flex-col sm:flex-row gap-3 mb-6">
        <div class="flex-1">
          <Input
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            placeholder="Search agents by name, role or tag…"
            icon={
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            }
          />
        </div>
        <div class="flex gap-2">
          {(["all", "Free", "Pro"] as const).map((f) => (
            <button
              class={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${filter() === f ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30" : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Grid */}
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <For each={filtered()}>
          {(agent) => (
            <Card class="flex flex-col gap-3 hover:scale-[1.01] transition-transform duration-200">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet/20 to-neon-cyan/10 flex items-center justify-center text-xl">
                    {agent.avatar}
                  </div>
                  <div>
                    <p class="font-semibold text-white text-sm">{agent.name}</p>
                    <p class="text-xs text-gray-400">{agent.role}</p>
                  </div>
                </div>
                <span class={`px-2 py-0.5 text-xs font-semibold rounded-full ${agent.price === "Free" ? "text-neon-emerald bg-neon-emerald/10" : "text-neon-amber bg-neon-amber/10"}`}>
                  {agent.price}
                </span>
              </div>

              <p class="text-xs text-gray-400 leading-relaxed">{agent.description}</p>

              <div class="flex flex-wrap gap-1.5">
                <For each={agent.tags}>
                  {(tag) => (
                    <span class="px-2 py-0.5 text-xs font-medium text-neon-violet bg-neon-violet/10 rounded-full">{tag}</span>
                  )}
                </For>
              </div>

              <div class="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                <span class="text-xs text-gray-500">
                  by <span class="text-gray-400">{agent.author}</span> · ⬇️ {agent.downloads.toLocaleString()}
                </span>
                <Button size="sm">Hire</Button>
              </div>
            </Card>
          )}
        </For>
      </div>
    </DashboardLayout>
  );
};

export default Marketplace;
