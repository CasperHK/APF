/**
 * DashboardLayout — L-shaped chrome used by all authenticated pages.
 *
 * Structure:
 *   ┌─────────────────────────────────────┐
 *   │  Navbar (top bar, full width)       │  ← horizontal bar of the "L"
 *   ├──────────┬──────────────────────────┤
 *   │ Sidebar  │                          │
 *   │ (left    │   Main content area      │  ← vertical bar + content
 *   │  fixed)  │                          │
 *   └──────────┴──────────────────────────┘
 *                          Footer (fixed bottom)
 */
import { animate } from "@motionone/dom";
import { Component, createEffect, JSX, on, onMount } from "solid-js";
import { useLocation } from "@solidjs/router";
import Sidebar from "@components/Sidebar";
import Navbar from "@components/Navbar";

interface DashboardLayoutProps {
  children: JSX.Element;
}

const DashboardLayout: Component<DashboardLayoutProps> = (props) => {
  const location = useLocation();
  let contentRef: HTMLDivElement | undefined;

  const animateIn = () => {
    if (!contentRef) return;
    const prefersReduced = typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

    if (prefersReduced) {
      animate(contentRef, { opacity: [0, 1] }, { duration: 0.2, easing: "ease-out" });
    } else {
      animate(contentRef, { opacity: [0, 1], y: [16, 0] }, { duration: 0.35, easing: "ease-out" });
    }
  };

  onMount(async () => {
    // Defer Flowbite init until after hydration to avoid DOM mutation races
    const { initFlowbite } = await import("flowbite");
    requestAnimationFrame(() => initFlowbite());
    animateIn();
  });

  // Re-animate when the route changes
  createEffect(on(() => location.pathname, animateIn));

  return (
    <div class="min-h-screen bg-dark-900 grid-pattern">
      {/* ── Top bar (horizontal L) ── */}
      <Navbar />

      {/* ── Left sidebar (vertical L) ── */}
      <Sidebar />

      {/* ── Main content ── */}
      <main class="p-4 sm:ml-64 mt-16 pb-12">
        <div ref={contentRef} class="p-2 md:p-4">
          {props.children}
        </div>
      </main>

      {/* ── Footer status bar ── */}
      <footer class="fixed bottom-0 left-0 z-30 w-full sm:ml-64">
        <div class="futuristic-navbar px-4 py-2 flex items-center justify-between text-xs text-gray-500">
          <div class="flex items-center space-x-4">
            <span class="flex items-center">
              <span class="w-2 h-2 rounded-full bg-neon-emerald mr-1.5 animate-pulse" />
              All systems operational
            </span>
            <span>|</span>
            <span>APF v0.1.0 · Phase 1</span>
          </div>
          <div class="hidden md:flex items-center space-x-4">
            <span>Single Container</span>
            <span>|</span>
            <span>Elysia + SolidStart</span>
            <span>|</span>
            <span>&copy; 2026 APF</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout;
