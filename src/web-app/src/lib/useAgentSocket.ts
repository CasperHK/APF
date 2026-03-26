import { createSignal, onCleanup, onMount } from "solid-js";
import type { ChatMessage, AgentStatus } from "./api-types";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080/ws";

export interface AgentSocketOptions {
  roomId?: string;
  onMessage?: (msg: ChatMessage) => void;
  onStatusChange?: (agentId: string, status: AgentStatus) => void;
}

export function useAgentSocket(opts: AgentSocketOptions = {}) {
  const [isConnected, setIsConnected] = createSignal(false);
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [error, setError] = createSignal<string | null>(null);
  let ws: WebSocket | null = null;

  const connect = () => {
    if (typeof window === "undefined") return;
    const url = opts.roomId ? `${WS_URL}?room=${opts.roomId}` : WS_URL;
    ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as ChatMessage;
        setMessages((prev) => [...prev, data]);
        opts.onMessage?.(data);
        if (data.type === "log" && opts.onStatusChange) {
          // parse agent status updates from log messages
        }
      } catch {
        // non-JSON message ignored
      }
    };

    ws.onerror = () => setError("WebSocket connection error");

    ws.onclose = () => {
      setIsConnected(false);
      // Reconnect after 3 seconds
      setTimeout(connect, 3000);
    };
  };

  onMount(connect);
  onCleanup(() => {
    ws?.close();
  });

  const send = (payload: Record<string, unknown>) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  return { isConnected, messages, error, send };
}
