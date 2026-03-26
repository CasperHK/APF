import { A, useLocation } from "@solidjs/router";
import { For } from "solid-js";

const navLinks = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/marketplace", label: "Marketplace", icon: "🏪" },
  { href: "/war-room", label: "War Room", icon: "⚔️" },
  { href: "/workspace", label: "Workspace", icon: "📁" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside style={{
      width: "240px",
      "min-height": "100vh",
      background: "var(--bg-surface)",
      "border-right": "1px solid var(--border)",
      display: "flex",
      "flex-direction": "column",
      padding: "1.5rem 1rem",
      "flex-shrink": "0",
    }}>
      <div style={{ "margin-bottom": "2rem" }}>
        <h1 style={{ margin: 0, "font-size": "1.25rem", "font-weight": "700", color: "#c4b5fd" }}>
          🎭 APF
        </h1>
        <p style={{ margin: "0.25rem 0 0", "font-size": "0.75rem", color: "var(--text-muted)" }}>
          Agentic Persona Factory
        </p>
      </div>

      <nav style={{ flex: 1 }}>
        <For each={navLinks}>
          {(link) => (
            <A
              href={link.href}
              style={{
                display: "flex",
                "align-items": "center",
                gap: "0.75rem",
                padding: "0.625rem 0.875rem",
                "border-radius": "0.5rem",
                "text-decoration": "none",
                color: location.pathname === link.href ? "#c4b5fd" : "var(--text-muted)",
                background: location.pathname === link.href ? "rgba(124,58,237,0.15)" : "transparent",
                "margin-bottom": "0.25rem",
                "font-size": "0.875rem",
                "font-weight": location.pathname === link.href ? "600" : "400",
                transition: "all 0.15s",
              }}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </A>
          )}
        </For>
      </nav>

      <div style={{
        "margin-top": "auto",
        "padding-top": "1rem",
        "border-top": "1px solid var(--border)",
        "font-size": "0.75rem",
        color: "var(--text-muted)",
      }}>
        v0.1.0 · Phase 1
      </div>
    </aside>
  );
}
