// 简化版 Live Bar（Figma 92:68）：满宽贴边黑条，Entry / Nav 两种用法用 children 区分，
// 骨架阶段不做 detach 精细还原，先保证"实时内容用同一形态"这条视觉规则成立。
import type { PropsWithChildren } from "react";

export function LiveBar({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-ink-strong text-paper-base rounded-none px-fig16 py-fig12 flex items-center justify-between"
    >
      {children}
    </button>
  );
}
