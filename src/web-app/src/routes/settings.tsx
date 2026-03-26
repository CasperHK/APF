import { Title } from "@solidjs/meta";
import { createSignal } from "solid-js";
import { Sidebar } from "~/components/Sidebar";

export default function Settings() {
  const [apiUrl, setApiUrl] = createSignal(
    typeof window !== "undefined"
      ? (import.meta.env?.VITE_API_URL ?? "http://localhost:8080")
      : "http://localhost:8080"
  );
  const [wsUrl, setWsUrl] = createSignal(
    typeof window !== "undefined"
      ? (import.meta.env?.VITE_WS_URL ?? "ws://localhost:8080/ws")
      : "ws://localhost:8080/ws"
  );

  return (
    <>
      <Title>Settings · APF</Title>
      <div style={{ display: "flex", "min-height": "100vh" }}>
        <Sidebar />
        <main style={{ flex: 1, padding: "2rem", overflow: "auto" }}>
          <div style={{ "margin-bottom": "2rem" }}>
            <h1 style={{ margin: 0, "font-size": "1.75rem", "font-weight": "700" }}>⚙️ Settings</h1>
            <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)" }}>
              Configure API endpoints and preferences
            </p>
          </div>

          <div class="card" style={{ "max-width": "560px" }}>
            <h2 style={{ margin: "0 0 1.5rem", "font-size": "1rem", "font-weight": "600" }}>API Configuration</h2>

            <div style={{ "margin-bottom": "1rem" }}>
              <label style={{ display: "block", "font-size": "0.875rem", "font-weight": "500", "margin-bottom": "0.5rem" }}>
                API Server URL
              </label>
              <input
                value={apiUrl()}
                onInput={(e) => setApiUrl(e.currentTarget.value)}
                style={{
                  width: "100%", background: "#0f172a", border: "1px solid var(--border)",
                  "border-radius": "0.5rem", padding: "0.625rem 0.875rem",
                  color: "#f1f5f9", "font-size": "0.875rem", outline: "none",
                }}
              />
            </div>

            <div style={{ "margin-bottom": "1.5rem" }}>
              <label style={{ display: "block", "font-size": "0.875rem", "font-weight": "500", "margin-bottom": "0.5rem" }}>
                WebSocket URL
              </label>
              <input
                value={wsUrl()}
                onInput={(e) => setWsUrl(e.currentTarget.value)}
                style={{
                  width: "100%", background: "#0f172a", border: "1px solid var(--border)",
                  "border-radius": "0.5rem", padding: "0.625rem 0.875rem",
                  color: "#f1f5f9", "font-size": "0.875rem", outline: "none",
                }}
              />
            </div>

            <button class="btn-primary">Save Configuration</button>
          </div>
        </main>
      </div>
    </>
  );
}
