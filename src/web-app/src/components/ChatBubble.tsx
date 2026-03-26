/**
 * ChatBubble — renders a single War Room message with type-specific styling.
 */
import { Component } from "solid-js";
import type { ChatMessage } from "@shared/schemas";

interface ChatBubbleProps {
  message: ChatMessage;
}

const typeConfig: Record<
  string,
  { label: string; emoji: string; border: string; bg: string }
> = {
  message:   { label: "message",   emoji: "💬", border: "border-l-neon-violet",  bg: "bg-white/[0.03]"    },
  log:       { label: "log",       emoji: "📋", border: "border-l-dark-600",     bg: "bg-dark-900/60"     },
  tool_call: { label: "tool call", emoji: "🔧", border: "border-l-neon-amber",   bg: "bg-neon-amber/[0.04]" },
  result:    { label: "result",    emoji: "✅", border: "border-l-neon-emerald", bg: "bg-neon-emerald/[0.04]" },
};

const ChatBubble: Component<ChatBubbleProps> = (props) => {
  const cfg = () => typeConfig[props.message.type] ?? typeConfig.message;
  const isHuman = () => props.message.agentId === "human";

  return (
    <div
      class={`border-l-2 pl-4 pr-3 py-3 rounded-r-xl mb-2 transition-colors ${cfg().border} ${cfg().bg} ${isHuman() ? "ml-8" : ""}`}
    >
      <div class="flex items-center gap-2 mb-1">
        {!isHuman() && (
          <img
            class="w-5 h-5 rounded-full shrink-0"
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${props.message.agentId}`}
            alt={props.message.agentName}
          />
        )}
        <span class="text-xs font-semibold text-gray-200">{props.message.agentName}</span>
        <span class="text-xs text-gray-500">{cfg().emoji} {cfg().label}</span>
        <span class="ml-auto text-xs text-gray-600">
          {new Date(props.message.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <p class="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{props.message.content}</p>
    </div>
  );
};

export default ChatBubble;
