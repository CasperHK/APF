import { Title } from "@solidjs/meta";
import { createSignal, For, onMount } from "solid-js";
import { Sidebar } from "~/components/Sidebar";
import { ChatBubble } from "~/components/ChatBubble";
import { useAgentSocket } from "~/lib/useAgentSocket";
import type { ChatMessage } from "~/lib/api-types";
import { animate } from "motion";

const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: "1", agentId: "ogilvy-copywriter", agentName: "Ogilvy Copywriter",
    content: "I've reviewed the brand brief. The headline needs to lead with a concrete benefit, not a clever pun. Research shows direct headlines outperform clever ones 4-to-1.",
    timestamp: new Date(Date.now() - 120000).toISOString(), type: "message",
  },
  {
    id: "2", agentId: "growth-hacker", agentName: "Growth Hacker",
    content: "Disagree. A/B test data from Product Hunt launches shows that curiosity-gap headlines drive 2.3x more clicks in the tech audience segment we're targeting.",
    timestamp: new Date(Date.now() - 90000).toISOString(), type: "message",
  },
  {
    id: "3", agentId: "seo-specialist", agentName: "SEO Specialist",
    content: "Running SERP analysis for target keywords...",
    timestamp: new Date(Date.now() - 60000).toISOString(), type: "tool_call",
  },
  {
    id: "4", agentId: "seo-specialist", agentName: "SEO Specialist",
    content: "Top 3 ranking pages use direct benefit-focused H1 tags. Keyword 'AI content tool' has 12,000 monthly searches. Recommend: combine benefit clarity + keyword targeting.",
    timestamp: new Date(Date.now() - 30000).toISOString(), type: "result",
  },
];

export default function WarRoom() {
  const [input, setInput] = createSignal("");
  const [localMessages, setLocalMessages] = createSignal<ChatMessage[]>(DEMO_MESSAGES);
  let chatRef: HTMLDivElement | undefined;
  let headerRef: HTMLDivElement | undefined;

  onMount(() => {
    if (headerRef) {
      animate(headerRef, { opacity: [0, 1], y: [-10, 0] }, { duration: 0.4 });
    }
  });

  const { isConnected, messages, send } = useAgentSocket({
    roomId: "marketing-war-room",
    onMessage: (msg) => setLocalMessages((prev) => [...prev, msg]),
  });

  const allMessages = () => [...localMessages(), ...messages()];

  const sendMessage = () => {
    const text = input().trim();
    if (!text) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      agentId: "human",
      agentName: "You (Human-in-the-Loop)",
      content: text,
      timestamp: new Date().toISOString(),
      type: "message",
    };
    setLocalMessages((prev) => [...prev, msg]);
    send({ type: "human_message", content: text });
    setInput("");
  };

  return (
    <>
      <Title>War Room · APF</Title>
      <div style={{ display: "flex", "min-height": "100vh" }}>
        <Sidebar />
        <main style={{ flex: 1, display: "flex", "flex-direction": "column", overflow: "hidden" }}>
          {/* Header */}
          <div ref={headerRef} style={{
            padding: "1.5rem 2rem",
            "border-bottom": "1px solid var(--border)",
            display: "flex",
            "align-items": "center",
            "justify-content": "space-between",
            background: "var(--bg-surface)",
          }}>
            <div>
              <h1 style={{ margin: 0, "font-size": "1.5rem", "font-weight": "700" }}>⚔️ Agent War Room</h1>
              <p style={{ margin: "0.25rem 0 0", "font-size": "0.875rem", color: "var(--text-muted)" }}>
                Marketing Strategy Session · 3 agents active
              </p>
            </div>
            <div style={{ display: "flex", "align-items": "center", gap: "0.75rem" }}>
              <span style={{
                display: "inline-flex", "align-items": "center", gap: "0.375rem",
                "font-size": "0.8125rem", color: isConnected() ? "#10b981" : "#ef4444",
              }}>
                <span style={{
                  display: "inline-block", width: "8px", height: "8px",
                  "border-radius": "50%", background: isConnected() ? "#10b981" : "#ef4444",
                }} />
                {isConnected() ? "Live" : "Offline"}
              </span>
            </div>
          </div>

          {/* Active Agents Bar */}
          <div style={{
            display: "flex", gap: "0.5rem", padding: "0.75rem 2rem",
            "border-bottom": "1px solid var(--border)", background: "#0f172a",
            "overflow-x": "auto",
          }}>
            {["✍️ Ogilvy", "🚀 Growth Hacker", "🔍 SEO Specialist"].map((label) => (
              <span class="badge badge-purple">{label}</span>
            ))}
            <span class="badge badge-cyan">👤 You</span>
          </div>

          {/* Chat Messages */}
          <div ref={chatRef} style={{
            flex: 1, "overflow-y": "auto", padding: "1.5rem 2rem",
            display: "flex", "flex-direction": "column",
          }}>
            <For each={allMessages()}>
              {(msg) => <ChatBubble message={msg} />}
            </For>
          </div>

          {/* Input */}
          <div style={{
            padding: "1rem 2rem", "border-top": "1px solid var(--border)",
            background: "var(--bg-surface)", display: "flex", gap: "0.75rem",
          }}>
            <input
              value={input()}
              onInput={(e) => setInput(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Intervene in the debate… (Human-in-the-Loop)"
              style={{
                flex: 1, background: "#0f172a", border: "1px solid var(--border)",
                "border-radius": "0.5rem", padding: "0.625rem 1rem",
                color: "#f1f5f9", "font-size": "0.875rem", outline: "none",
              }}
            />
            <button class="btn-primary" onClick={sendMessage}>Send</button>
          </div>
        </main>
      </div>
    </>
  );
}
