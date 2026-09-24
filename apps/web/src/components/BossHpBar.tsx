// 对应 Figma Boss HP Bar 组件（20:50，S5 用的是 detach 版本，见
// claude/echocity-figma-prototype.md 待办 6）。骨架阶段先用标签+进度条还原基本形态，
// 不做 detach 版本里的额外装饰细节。
export function BossHpBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (current / total) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-ink-soft mb-1">
        <span>🐉 Boss HP</span>
        <span>
          {current} / {total}
        </span>
      </div>
      <div className="w-full h-4 bg-paper-base border-2 border-ink-strong rounded-md overflow-hidden">
        <div
          className="h-full bg-accent-red transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
