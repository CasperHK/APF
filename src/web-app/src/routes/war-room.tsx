import { Title } from "@solidjs/meta";
import { animate } from "@motionone/dom";
import { Component, createSignal, For, onMount } from "solid-js";
import DashboardLayout from "@layouts/DashboardLayout";
import ChatBubble from "@components/ChatBubble";
import Button from "@components/ui/Button";
import { useAgentSocket } from "~/lib/useAgentSocket";
import type { ChatMessage } from "@shared/schemas";

const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: "1", agentId: "ogilvy-copywriter", agentName: "Ogilvy Copywriter",
    content: "I've reviewed the brand brief. The headline needs to lead with a concrete benefit, not a clever pun. Research shows direct headlines outperform clever ones 4-to-1.",
    timestamp: new Date(Date.now() - 120000).toISOString(), type: "message",
  },
  {
    id: "2", agentId: "growth-hacker", agentName: "Growth Hacker",
    content: "Disagree. A/B test data from Product Hunt launches shows curiosity-gap headlines drive 2.3× more clicks in the tech audience segment we're targeting.",
    timestamp: new Date(Date.now() - 90000).toISOString(), type: "message",
  },
  {
    id: "3", agentId: "seo-specialist", agentName: "SEO Specialist",
    content: "Running SERP analysis for target keywords…",
    timestamp: new Date(Date.now() - 60000).toISOString(), type: "tool_call",
  },
  {
    id: "4", agentId: "seo-specialist", agentName: "SEO Specialist",
    content: "Top 3 ranking pages use direct benefit-focused H1 tags. 'AI content tool' — 12K monthly searches. Recommend: combine benefit clarity + keyword targeting.",
    timestamp: new Date(Date.now() - 30000).toISOString(), type: "result",
  },
];

const ACTIVE_AGENTS = [
  { id: "ogilvy-copywriter", name: "Ogilvy",       emoji: "✍️" },
  { id: "growth-hacker",     name: "Growth",        emoji: "🚀" },
  { id: "seo-specialist",    name: "SEO",           emoji: "🔍" },
];

const WarRoom: Component = () => {
  const [input, setInput] = createSignal("");
  const [localMessages, setLocalMessages] = createSignal<ChatMessage[]>(DEMO_MESSAGES);
  let chatRef: HTMLDivElement | undefined;
  let headerRef: HTMLDivElement | undefined;

  onMount(() => {
    if (headerRef) {
      animate(headerRef, { opacity: [0, 1], y: [-10, 0] }, { duration: 0.4, easing: "ease-out" });
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
    send({ type: "human_message", content: text, room: "marketing-war-room" });
    setInput("");
    // Scroll to bottom
    requestAnimationFrame(() => {
      chatRef?.scrollTo({ top: chatRef.scrollHeight, behavior: "smooth" });
    });
  };

  return (
    <DashboardLayout>
      <Title>War Room — APF</Title>

      {/* Room header */}
      <div ref={headerRef} class="glass-card-strong p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold text-white flex items-center gap-2">
            ⚔️ Agent War Room
            <span class="text-xs font-normal text-gray-400">· Marketing Strategy Session</span>
          </h1>
          <p class="text-sm text-gray-400 mt-0.5">Human-in-the-Loop enabled · Real-time WebSocket</p>
        </div>
        <div class="flex items-center gap-3">
          {/* Active agents */}
          <div class="flex items-center gap-2">
            <For each={ACTIVE_AGENTS}>
              {(a) => (
                <span title={a.name} class="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm cursor-default">
                  {a.emoji}
                </span>
              )}
            </For>
            <span class="text-xs text-gray-400 ml-1">+You</span>
          </div>

          {/* Connection status */}
          <span class={`inline-flex items-center gap-1.5 text-xs font-medium ${isConnected() ? "text-neon-emerald" : "text-gray-500"}`}>
            <span class={`w-2 h-2 rounded-full ${isConnected() ? "bg-neon-emerald pulse-dot" : "bg-gray-600"}`} />
            {isConnected() ? "Live" : "Connecting…"}
          </span>
        </div>
      </div>

      {/* Chat area + sidebar layout */}
      <div class="grid grid-cols-1 xl:grid-cols-4 gap-4 h-[calc(100vh-280px)] min-h-[400px]">
        {/* Message feed */}
        <div class="xl:col-span-3 flex flex-col glass-card overflow-hidden">
          <div ref={chatRef} class="flex-1 overflow-y-auto p-4 space-y-1">
            <For each={allMessages()}>
              {(msg) => <ChatBubble message={msg} />}
            </For>
          </div>

          {/* Input bar */}
          <div class="p-3 border-t border-white/10 flex gap-2">
            <input
              class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan/50 transition-all"
              value={input()}
              onInput={(e) => setInput(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Intervene in the debate… (Human-in-the-Loop)"
            />
            <Button onClick={sendMessage} size="sm">
              Send
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Agent status sidebar */}
        <div class="xl:col-span-1 glass-card p-4">
          <h3 class="text-sm font-semibold text-white mb-3">Active Agents</h3>
          <div class="space-y-3">
            <For each={ACTIVE_AGENTS}>
              {(a) => (
                <div class="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03]">
                  <span class="text-xl">{a.emoji}</span>
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-gray-200 truncate">{a.name}</p>
                    <p class="text-xs text-neon-cyan">active</p>
                  </div>
                </div>
              )}
            </For>
            <div class="flex items-center gap-3 p-2 rounded-lg bg-neon-violet/5 border border-neon-violet/20">
              <span class="text-xl">👤</span>
              <div class="min-w-0">
                <p class="text-xs font-medium text-gray-200 truncate">You</p>
                <p class="text-xs text-neon-violet">Human-in-the-Loop</p>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-white/10">
            <p class="text-xs text-gray-500 mb-2 font-medium">Quick Actions</p>
            <div class="space-y-2">
              <Button variant="secondary" size="sm" fullWidth>
                📋 Export Transcript
              </Button>
              <Button variant="ghost" size="sm" fullWidth>
                🔄 Reset Room
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default WarRoom;
