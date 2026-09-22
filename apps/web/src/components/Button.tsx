import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "accent";

const variantClasses: Record<Variant, string> = {
  // Primary = 黑色确认块，Figma 统一 50 高（Diasy 2026-09-21）
  primary: "bg-ink-strong text-paper-base h-[50px]",
  secondary: "bg-paper-raised text-ink-strong h-[50px] border-2 border-ink-strong",
  accent: "bg-accent-red text-paper-base h-[50px]",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`px-fig16 rounded-md shadow-hard font-pixel text-sm tracking-wide disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
