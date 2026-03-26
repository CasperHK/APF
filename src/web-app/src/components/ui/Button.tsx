import { Component, JSX, splitProps } from "solid-js";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "text-white bg-gradient-to-r from-neon-cyan to-neon-violet hover:from-neon-cyan/90 hover:to-neon-violet/90 shadow-lg shadow-neon-cyan/20 hover:shadow-neon-cyan/40",
  secondary:
    "text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10",
  danger:
    "text-white bg-gradient-to-r from-neon-rose to-neon-rose/80 hover:opacity-90 shadow-lg shadow-neon-rose/20",
  ghost:
    "text-gray-400 hover:text-gray-200 hover:bg-white/5",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

const Button: Component<ButtonProps> = (props) => {
  const [local, rest] = splitProps(props, ["variant", "size", "fullWidth", "class", "children"]);
  const v = () => local.variant ?? "primary";
  const s = () => local.size ?? "md";

  return (
    <button
      class={`font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 inline-flex items-center justify-center gap-2 ${variantClasses[v()]} ${sizeClasses[s()]} ${local.fullWidth ? "w-full" : ""} ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </button>
  );
};

export default Button;
