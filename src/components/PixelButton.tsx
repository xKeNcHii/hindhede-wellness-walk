import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-forest-700 text-sand hover:bg-forest-500",
  ghost: "bg-forest-900 text-forest-300 hover:bg-forest-800",
  danger: "bg-clay text-forest-950 hover:brightness-110",
};

export function PixelButton({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`pixel-border px-4 py-3 text-[10px] leading-relaxed uppercase tracking-wide transition disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    />
  );
}
