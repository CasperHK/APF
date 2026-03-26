import { Component, JSX, Show, splitProps } from "solid-js";

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: JSX.Element;
}

const Input: Component<InputProps> = (props) => {
  const [local, rest] = splitProps(props, ["label", "error", "icon", "class"]);

  return (
    <div>
      <Show when={local.label}>
        <label for={rest.id as string} class="block mb-2 text-sm font-medium text-gray-300">
          {local.label}
        </label>
      </Show>
      <div class="relative">
        <Show when={local.icon}>
          <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-500">
            {local.icon}
          </div>
        </Show>
        <input
          class={`w-full ${local.icon ? "pl-10" : "pl-4"} pr-4 py-2.5 text-sm rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 ${
            local.error
              ? "text-neon-rose bg-neon-rose/5 border border-neon-rose/30 focus:ring-neon-rose/50 placeholder-neon-rose/50"
              : "text-white bg-white/5 border border-white/10 focus:ring-neon-cyan/50 focus:border-neon-cyan/50 placeholder-gray-500"
          } ${local.class ?? ""}`}
          {...rest}
        />
      </div>
      <Show when={local.error}>
        <p class="mt-1.5 text-xs text-neon-rose">{local.error}</p>
      </Show>
    </div>
  );
};

export default Input;
