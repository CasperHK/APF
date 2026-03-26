/**
 * AgentCard — displays an individual AI persona with Motion One animations.
 */
import { animate } from "@motionone/dom";
import { Component, createEffect, onMount } from "solid-js";
import type { Agent } from "@shared/schemas";
import AgentStatusBadge from "@components/AgentStatusBadge";

interface AgentCardProps {
  agent: Agent;
  onActivate?: (id: string) => void;
  onRemove?: (id: string) => void;
}

const AgentCard: Component<AgentCardProps> = (props) => {
  let cardRef: HTMLDivElement | undefined;
  let dotRef: HTMLSpanElement | undefined;

  onMount(() => {
    if (cardRef) {
      animate(cardRef, { opacity: [0, 1], y: [12, 0] }, { duration: 0.35, easing: "ease-out" });
    }
  });

  createEffect(() => {
    if (!dotRef) return;
    const active = props.agent.status === "thinking" || props.agent.status === "executing";
    if (active) {
      animate(dotRef, { scale: [1, 1.4, 1] }, { duration: 0.8, repeat: Infinity, easing: "ease-in-out" });
    } else {
      animate(dotRef, { scale: 1 }, { duration: 0.2 });
    }
  });

  return (
    <div
      ref={cardRef}
      class="glass-card p-5 hover:scale-[1.02] hover:border-neon-violet/40 transition-all duration-200 cursor-pointer group"
      onClick={() => props.onActivate?.(props.agent.id)}
    >
      {/* Header row */}
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet/20 to-neon-cyan/10 flex items-center justify-center text-xl shrink-0">
            {props.agent.avatar ?? "🤖"}
          </div>
          <div>
            <p class="font-semibold text-white text-sm leading-tight">{props.agent.name}</p>
            <p class="text-xs text-gray-400 leading-tight mt-0.5">{props.agent.role}</p>
          </div>
        </div>
        <span ref={dotRef} class="mt-1">
          <AgentStatusBadge status={props.agent.status} animated />
        </span>
      </div>

      {/* Description */}
      <p class="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">
        {props.agent.description ?? "No description provided."}
      </p>

      {/* Tags */}
      <div class="flex flex-wrap gap-1.5 mb-3">
        {props.agent.tags.map((tag) => (
          <span class="px-2 py-0.5 text-xs font-medium text-neon-violet bg-neon-violet/10 rounded-full">
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div class="flex items-center justify-between pt-2 border-t border-white/5">
        <span class="text-xs text-gray-500">
          Model: <span class="text-neon-cyan font-medium">{props.agent.model}</span>
        </span>
        <button
          class="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-neon-violet hover:text-neon-cyan font-medium"
          onClick={(e) => { e.stopPropagation(); props.onActivate?.(props.agent.id); }}
        >
          Activate →
        </button>
      </div>
    </div>
  );
};

export default AgentCard;
