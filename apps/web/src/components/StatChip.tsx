// 对应 Figma Stat Chip 组件：资源计数胶囊
export function StatChip({ icon, value, label }: { icon: string; value: number | string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-paper-base border border-paper-line px-fig12 py-1 text-xs text-ink-base"
      title={label}
    >
      <span aria-hidden>{icon}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}
