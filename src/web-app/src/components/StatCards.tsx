/**
 * StatCards — APF-specific KPI row for the dashboard.
 */
import { Component, For } from "solid-js";

interface StatCard {
  label: string;
  value: string | number;
  change: string;
  up: boolean;
  glowClass: string;
  accentColor: string;
  bgGradient: string;
  emoji: string;
}

const stats: StatCard[] = [
  { label: "Total Agents",   value: 4,    change: "+2",     up: true,  glowClass: "glow-violet",  accentColor: "text-neon-violet",  bgGradient: "from-neon-violet/20 to-neon-violet/5",  emoji: "🤖" },
  { label: "Active Now",     value: 2,    change: "+1",     up: true,  glowClass: "glow-cyan",    accentColor: "text-neon-cyan",    bgGradient: "from-neon-cyan/20 to-neon-cyan/5",      emoji: "⚡" },
  { label: "Tasks Completed",value: 12,   change: "+5",     up: true,  glowClass: "glow-emerald", accentColor: "text-neon-emerald", bgGradient: "from-neon-emerald/20 to-neon-emerald/5",emoji: "✅" },
  { label: "War Rooms",      value: 2,    change: "1 live", up: true,  glowClass: "glow-rose",    accentColor: "text-neon-amber",   bgGradient: "from-neon-amber/20 to-neon-amber/5",    emoji: "⚔️" },
];

const StatCards: Component = () => {
  return (
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <For each={stats}>
        {(stat) => (
          <div class={`glass-card p-5 hover:scale-[1.02] transition-all duration-300 cursor-pointer ${stat.glowClass}`}>
            <div class="flex items-center justify-between mb-4">
              <div class={`p-2.5 rounded-xl bg-gradient-to-br ${stat.bgGradient} text-xl`}>
                {stat.emoji}
              </div>
              <span class={`inline-flex items-center gap-0.5 px-2.5 py-1 text-xs font-semibold rounded-full ${stat.up ? "text-neon-emerald bg-neon-emerald/10" : "text-neon-rose bg-neon-rose/10"}`}>
                {stat.up ? "▲" : "▼"} {stat.change}
              </span>
            </div>
            <p class={`text-2xl font-bold ${stat.accentColor} mb-1`}>{stat.value}</p>
            <p class="text-sm text-gray-400">{stat.label}</p>
          </div>
        )}
      </For>
    </div>
  );
};

export default StatCards;
