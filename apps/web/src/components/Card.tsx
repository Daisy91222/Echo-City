import type { PropsWithChildren } from "react";

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`bg-paper-raised border-2 border-ink-strong rounded-lg shadow-hard p-fig16 ${className}`}
    >
      {children}
    </div>
  );
}
