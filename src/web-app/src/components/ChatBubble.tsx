import type { ChatMessage } from "~/lib/api-types";

interface ChatBubbleProps {
  message: ChatMessage;
}

const TYPE_STYLES: Record<string, { bg: string; accent: string }> = {
  message: { bg: "var(--bg-card)", accent: "#c4b5fd" },
  log:     { bg: "#0f172a",        accent: "#94a3b8" },
  tool_call: { bg: "#1c1917",      accent: "#f59e0b" },
  result:  { bg: "#052e16",        accent: "#6ee7b7" },
};

export function ChatBubble(props: ChatBubbleProps) {
  const style = TYPE_STYLES[props.message.type] ?? TYPE_STYLES.message;

  return (
    <div style={{
      background: style.bg,
      border: `1px solid ${style.accent}33`,
      "border-radius": "0.75rem",
      padding: "0.875rem 1rem",
      "margin-bottom": "0.75rem",
      "font-size": "0.875rem",
    }}>
      <div style={{ display: "flex", "align-items": "center", gap: "0.5rem", "margin-bottom": "0.375rem" }}>
        <span style={{ "font-weight": "600", color: style.accent }}>{props.message.agentName}</span>
        <span style={{ "font-size": "0.7rem", color: "var(--text-muted)" }}>
          {props.message.type === "tool_call" ? "🔧 tool" : props.message.type === "log" ? "📋 log" : props.message.type === "result" ? "✅ result" : "💬"}
        </span>
        <span style={{ "font-size": "0.7rem", color: "var(--text-muted)", "margin-left": "auto" }}>
          {new Date(props.message.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <p style={{ margin: 0, "line-height": "1.6", color: "#f1f5f9", "white-space": "pre-wrap" }}>
        {props.message.content}
      </p>
    </div>
  );
}
