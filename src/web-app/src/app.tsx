// @refresh reload
import { Suspense } from "solid-js";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { MetaProvider, Title } from "@solidjs/meta";
import { ThemeProvider } from "./context/ThemeContext";
import "./app.css";

export default function App() {
  return (
    <ThemeProvider>
      <Router
        root={(props) => (
          <MetaProvider>
            <Title>APF — Agentic Persona Factory</Title>
            <Suspense>{props.children}</Suspense>
          </MetaProvider>
        )}
      >
        <FileRoutes />
      </Router>
    </ThemeProvider>
  );
}
