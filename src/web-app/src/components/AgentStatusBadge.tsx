import { Component } from "solid-js";
import type { AgentStatus } from "@shared/schemas";

interface AgentStatusBadgeProps {
  status: AgentStatus;
  /** Show animated dot when agent is active */
  animated?: boolean;
}

const config: Record<AgentStatus, { dot: string; label: string; text: string }> = {
  idle:      { dot: "bg-gray-500",       label: "Idle",       text: "text-gray-400"    },
  thinking:  { dot: "bg-neon-amber",     label: "Thinking…",  text: "text-neon-amber"  },
  executing: { dot: "bg-neon-cyan",      label: "Executing",  text: "text-neon-cyan"   },
  done:      { dot: "bg-neon-emerald",   label: "Done",       text: "text-neon-emerald"},
  error:     { dot: "bg-neon-rose",      label: "Error",      text: "text-neon-rose"   },
};

const AgentStatusBadge: Component<AgentStatusBadgeProps> = (props) => {
  const cfg = () => config[props.status];
  const isActive = () => props.status === "thinking" || props.status === "executing";

  return (
    <span class={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg().text}`}>
      <span
        class={`inline-block w-2 h-2 rounded-full ${cfg().dot} ${isActive() && props.animated !== false ? "agent-thinking" : ""}`}
      />
      {cfg().label}
    </span>
  );
};

export default AgentStatusBadge;
