/**
 * AgentActivityFeed — timeline of recent agent actions (APF-specific).
 */
import { Component, For } from "solid-js";

interface ActivityItem {
  id: number;
  agentName: string;
  agentId: string;
  action: string;
  target: string;
  time: string;
  type: "task" | "tool" | "message" | "alert" | "complete";
}

const activities: ActivityItem[] = [
  { id: 1, agentName: "SEO Specialist",   agentId: "seo-specialist",   action: "completed analysis for", target: "target keywords",        time: "2 min ago",  type: "complete" },
  { id: 2, agentName: "Growth Hacker",    agentId: "growth-hacker",    action: "called tool",            target: "search_serp()",           time: "8 min ago",  type: "tool"     },
  { id: 3, agentName: "Ogilvy Copywriter",agentId: "ogilvy-copywriter",action: "generated draft",        target: "Social_Post_v1.md",       time: "15 min ago", type: "task"     },
  { id: 4, agentName: "SEO Specialist",   agentId: "seo-specialist",   action: "sent message to",        target: "War Room",                time: "22 min ago", type: "message"  },
  { id: 5, agentName: "System",           agentId: "system",           action: "alert:",                 target: "Agent token limit at 80%",time: "1 hr ago",   type: "alert"    },
];

const typeConfig: Record<ActivityItem["type"], { color: string; icon: string }> = {
  complete: { color: "bg-neon-emerald", icon: "✓" },
  tool:     { color: "bg-neon-amber",   icon: "🔧" },
  task:     { color: "bg-neon-cyan",    icon: "📝" },
  message:  { color: "bg-neon-violet",  icon: "💬" },
  alert:    { color: "bg-neon-rose",    icon: "⚠" },
};

const AgentActivityFeed: Component = () => {
  return (
    <div class="glass-card p-5">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-lg font-semibold text-white">Agent Activity</h3>
        <a href="/war-room" class="text-xs text-neon-cyan hover:underline">Open War Room →</a>
      </div>

      <ol class="relative border-l border-white/10 ml-3">
        <For each={activities}>
          {(item) => {
            const cfg = typeConfig[item.type];
            return (
              <li class="mb-5 ml-6 last:mb-0">
                <span class={`absolute flex items-center justify-center w-7 h-7 rounded-full -left-3.5 ring-4 ring-dark-900 ${cfg.color} text-white text-xs`}>
                  {cfg.icon}
                </span>
                <div class="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                  <div class="flex items-center gap-2 mb-1">
                    {item.agentId !== "system" && (
                      <img
                        class="w-5 h-5 rounded-full"
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.agentId}`}
                        alt={item.agentName}
                      />
                    )}
                    <span class="text-sm font-medium text-gray-200">{item.agentName}</span>
                    <span class="text-xs text-gray-500 ml-auto">{item.time}</span>
                  </div>
                  <p class="text-sm text-gray-400">
                    {item.action} <span class="text-gray-300 font-medium">{item.target}</span>
                  </p>
                </div>
              </li>
            );
          }}
        </For>
      </ol>
    </div>
  );
};

export default AgentActivityFeed;
