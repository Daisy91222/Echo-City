import type { HTMLAttributes, PropsWithChildren } from "react";

// 2026-10-03 新增 ...rest（透传 onClick 等原生 div 属性）：家庭成员位切换页
// （L3 SwitchAccount）需要让整张卡可点击来切换身份/工作区，之前 Card 只接受
// children/className 两个 prop，不支持任何事件处理。这是扩展现有组件支持新
// 用法，不是新建一个重复的卡片组件。
export function Card({
  children,
  className = "",
  ...rest
}: PropsWithChildren<{ className?: string } & HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={`bg-paper-raised border-2 border-ink-strong rounded-lg shadow-hard p-fig16 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
