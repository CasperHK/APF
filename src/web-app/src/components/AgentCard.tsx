import type { Agent } from "~/lib/api-types";
import { animate } from "motion";
import { createEffect, createSignal, onMount } from "solid-js";

interface AgentCardProps {
  agent: Agent;
  onActivate?: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  idle: "#94a3b8",
  thinking: "#f59e0b",
  executing: "#06b6d4",
  done: "#10b981",
  error: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  idle: "Idle",
  thinking: "Thinking…",
  executing: "Executing",
  done: "Done",
  error: "Error",
};

export function AgentCard(props: AgentCardProps) {
  let cardRef: HTMLDivElement | undefined;
  let dotRef: HTMLSpanElement | undefined;
  const [hovered, setHovered] = createSignal(false);

  onMount(() => {
    if (cardRef) {
      animate(cardRef, { opacity: [0, 1], y: [12, 0] }, { duration: 0.35, easing: "ease-out" });
    }
  });

  createEffect(() => {
    if (!dotRef) return;
    if (props.agent.status === "thinking" || props.agent.status === "executing") {
      animate(dotRef, { scale: [1, 1.4, 1] }, { duration: 0.8, repeat: Infinity, easing: "ease-in-out" });
    } else {
      animate(dotRef, { scale: 1 }, { duration: 0.2 });
    }
  });

  return (
    <div
      ref={cardRef}
      class="card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer",
        transition: "border-color 0.2s, transform 0.15s",
        transform: hovered() ? "translateY(-2px)" : "translateY(0)",
        "border-color": hovered() ? "var(--primary)" : "var(--border)",
      }}
      onClick={() => props.onActivate?.(props.agent.id)}
    >
      <div style={{ display: "flex", "align-items": "flex-start", "justify-content": "space-between", "margin-bottom": "0.75rem" }}>
        <div style={{ display: "flex", "align-items": "center", gap: "0.75rem" }}>
          <div style={{
            width: "2.5rem", height: "2.5rem", "border-radius": "50%",
            background: "var(--bg-card)", display: "flex", "align-items": "center",
            "justify-content": "center", "font-size": "1.25rem",
          }}>
            {props.agent.avatar ?? "🤖"}
          </div>
          <div>
            <p style={{ margin: 0, "font-weight": "600", "font-size": "0.9375rem" }}>{props.agent.name}</p>
            <p style={{ margin: 0, "font-size": "0.75rem", color: "var(--text-muted)" }}>{props.agent.role}</p>
          </div>
        </div>

        <div style={{ display: "flex", "align-items": "center", gap: "0.375rem" }}>
          <span
            ref={dotRef}
            style={{
              display: "inline-block",
              width: "8px", height: "8px", "border-radius": "50%",
              background: STATUS_COLORS[props.agent.status] ?? "#94a3b8",
            }}
          />
          <span style={{ "font-size": "0.75rem", color: "var(--text-muted)" }}>
            {STATUS_LABELS[props.agent.status] ?? props.agent.status}
          </span>
        </div>
      </div>

      <p style={{ margin: "0 0 0.75rem", "font-size": "0.8125rem", color: "var(--text-muted)", "line-height": "1.5" }}>
        {props.agent.description ?? "No description."}
      </p>

      <div style={{ display: "flex", gap: "0.5rem", "flex-wrap": "wrap" }}>
        {props.agent.tags.map((tag) => (
          <span class="badge badge-purple">{tag}</span>
        ))}
      </div>

      <div style={{ "margin-top": "1rem", "font-size": "0.75rem", color: "var(--text-muted)" }}>
        Model: <strong style={{ color: "#c4b5fd" }}>{props.agent.model}</strong>
      </div>
    </div>
  );
}
