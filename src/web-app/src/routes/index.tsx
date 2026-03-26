import { Title } from "@solidjs/meta";
import { Component, createSignal, For } from "solid-js";
import DashboardLayout from "@layouts/DashboardLayout";
import StatCards from "@components/StatCards";
import AgentCard from "@components/AgentCard";
import AgentActivityFeed from "@components/AgentActivityFeed";
import Button from "@components/ui/Button";
import type { Agent } from "@shared/schemas";

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
    description: "Data-driven first-principles thinker. Identifies growth loops, viral mechanics, and PMF levers.",
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
    description: "Understands Xiaohongshu algorithms and crafts viral hooks for the Chinese social commerce market.",
    tags: ["social", "viral", "China"],
  },
];

const Dashboard: Component = () => {
  const [agents] = createSignal<Agent[]>(DEMO_AGENTS);

  return (
    <DashboardLayout>
      <Title>Dashboard — APF</Title>

      {/* Welcome Banner */}
      <div class="glass-card-strong p-6 mb-6 relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-neon-violet/5 via-neon-cyan/5 to-neon-emerald/5 pointer-events-none" />
        <div class="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-white mb-1">
              Welcome to <span class="gradient-text">APF</span> 🎭
            </h1>
            <p class="text-gray-400 text-sm">
              Your multi-agent AI collaboration platform. Manage personas, start war rooms, and track tasks.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <Button variant="secondary" size="sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export Report
            </Button>
            <a href="/war-room">
              <Button size="sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Open War Room
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div class="mb-6">
        <StatCards />
      </div>

      {/* Agents + Activity */}
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Agent Grid */}
        <div class="xl:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-white">Active Agents</h2>
            <a href="/marketplace" class="text-xs text-neon-cyan hover:underline">Browse marketplace →</a>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <For each={agents()}>
              {(agent) => (
                <AgentCard
                  agent={agent}
                  onActivate={(id) => console.log("Activate", id)}
                />
              )}
            </For>
          </div>
        </div>

        {/* Activity Feed */}
        <div class="xl:col-span-1">
          <AgentActivityFeed />
        </div>
      </div>

      {/* Team compositions */}
      <div class="glass-card p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold text-white">Recommended Dream Teams</h3>
            <p class="text-sm text-gray-400 mt-0.5">Pre-built agent combinations for common tasks</p>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              name: "🚀 Silicon Valley Growth Chain",
              agents: ["Growth Hacker", "First Principles Officer", "Minimalist Designer"],
              use: "Product launches, pitch decks, tech commentary",
              gradient: "from-neon-cyan/10 to-neon-violet/10",
              border: "border-neon-cyan/20",
            },
            {
              name: "🔥 Viral Content Factory",
              agents: ["Xiaohongshu Expert", "Emotional Copywriter", "Headline Specialist"],
              use: "Social media, short-form video scripts",
              gradient: "from-neon-rose/10 to-neon-amber/10",
              border: "border-neon-rose/20",
            },
            {
              name: "📘 Evergreen Brand Group",
              agents: ["Ogilvy Copywriter", "PR Expert", "Content Auditor"],
              use: "Brand articles, press releases, official web copy",
              gradient: "from-neon-emerald/10 to-neon-cyan/10",
              border: "border-neon-emerald/20",
            },
          ].map((team) => (
            <div class={`p-4 rounded-xl bg-gradient-to-br ${team.gradient} border ${team.border}`}>
              <p class="font-semibold text-white text-sm mb-2">{team.name}</p>
              <div class="flex flex-wrap gap-1 mb-2">
                {team.agents.map((a) => (
                  <span class="px-2 py-0.5 text-xs text-gray-300 bg-white/5 rounded-full">{a}</span>
                ))}
              </div>
              <p class="text-xs text-gray-400">{team.use}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
