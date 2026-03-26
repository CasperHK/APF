/**
 * Reactive WebSocket hook for real-time agent logs and War Room chat.
 * Provides automatic reconnection with exponential back-off.
 */
import { createSignal, onCleanup, onMount } from "solid-js";
import type { ChatMessage } from "@shared/schemas";

const WS_BASE =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_WS_URL
    ? (import.meta.env.VITE_WS_URL as string)
    : undefined; // auto-derive from current origin when undefined

export interface AgentSocketOptions {
  roomId?: string;
  onMessage?: (msg: ChatMessage) => void;
}

function resolveWsUrl(roomId?: string): string {
  const base =
    WS_BASE ??
    (typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`
      : "ws://localhost:3000");
  const path = "/api/war-room/ws";
  return roomId ? `${base}${path}?room=${roomId}` : `${base}${path}`;
}

export function useAgentSocket(opts: AgentSocketOptions = {}) {
  const [isConnected, setIsConnected] = createSignal(false);
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [error, setError] = createSignal<string | null>(null);
  let ws: WebSocket | null = null;
  let retryMs = 1000;

  const connect = () => {
    if (typeof window === "undefined") return;
    ws = new WebSocket(resolveWsUrl(opts.roomId));

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      retryMs = 1000; // reset back-off
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as ChatMessage;
        if (data.id) {
          setMessages((prev) => [...prev, data]);
          opts.onMessage?.(data);
        }
      } catch {
        // non-JSON ping/pong frames are silently ignored
      }
    };

    ws.onerror = () => setError("WebSocket connection error");

    ws.onclose = () => {
      setIsConnected(false);
      // Exponential back-off reconnect (max 30 s)
      setTimeout(connect, Math.min(retryMs, 30000));
      retryMs = Math.min(retryMs * 2, 30000);
    };
  };

  onMount(connect);
  onCleanup(() => ws?.close());

  const send = (payload: Record<string, unknown>) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  return { isConnected, messages, error, send };
}
