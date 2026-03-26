import { Component, JSX, Show } from "solid-js";

type GlowVariant = "cyan" | "violet" | "emerald" | "rose" | "none";

interface CardProps {
  title?: string;
  subtitle?: string;
  glow?: GlowVariant;
  strong?: boolean;
  class?: string;
  headerAction?: JSX.Element;
  children: JSX.Element;
}

const glowClasses: Record<GlowVariant, string> = {
  cyan:    "glow-cyan",
  violet:  "glow-violet",
  emerald: "glow-emerald",
  rose:    "glow-rose",
  none:    "",
};

const Card: Component<CardProps> = (props) => {
  const base = () => (props.strong ? "glass-card-strong" : "glass-card");
  const glow = () => glowClasses[props.glow ?? "none"];

  return (
    <div class={`${base()} ${glow()} p-5 ${props.class ?? ""}`}>
      <Show when={props.title}>
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold text-white">{props.title}</h3>
            <Show when={props.subtitle}>
              <p class="text-sm text-gray-400 mt-0.5">{props.subtitle}</p>
            </Show>
          </div>
          <Show when={props.headerAction}>{props.headerAction}</Show>
        </div>
      </Show>
      {props.children}
    </div>
  );
};

export default Card;
