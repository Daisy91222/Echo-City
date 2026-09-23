// 主页背景等距地图的占位版本。真实素材（等距地图美术资源，按 G3 要求
// 每个园区各出一版）还没有拿到——见 build-plan §4"美术资源"待办。
// 这里先用几何色块画出三个分区（对应 §3 zone 枚举 eco/exhibit/community，
// 颜色取自 Figma 变量集 color/zone/*）+ 一个锚点标记，让 S1 至少看起来
// 是"一张地图"而不是空白，等真实素材到位后整块替换即可，不影响调用方。
const ZONES: { id: string; cx: number; cy: number; r: number; fill: string; label: string }[] = [
  { id: "eco", cx: 130, cy: 150, r: 90, fill: "#6e8f72", label: "Eco" },
  { id: "exhibit", cx: 280, cy: 110, r: 70, fill: "#a5738c", label: "Exhibit" },
  { id: "community", cx: 250, cy: 260, r: 80, fill: "#b8893f", label: "Community" },
];

// A1 太阳能路灯杆锚点在 eco 分区里的示意位置
const ANCHOR_MARKER = { x: 150, y: 130 };

export function MapBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 400 320"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <rect width="400" height="320" fill="#dfe7df" />
      {/* 简易等距网格纹理，纯装饰 */}
      <g stroke="#c9d6c9" strokeWidth="1" opacity="0.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 40} x2="400" y2={i * 40} />
        ))}
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="320" />
        ))}
      </g>
      {ZONES.map((z) => (
        <g key={z.id}>
          <ellipse cx={z.cx} cy={z.cy} rx={z.r} ry={z.r * 0.7} fill={z.fill} opacity="0.55" />
          <text
            x={z.cx}
            y={z.cy}
            textAnchor="middle"
            fontSize="12"
            fill="#111111"
            fontFamily="'Pixelify Sans', sans-serif"
            opacity="0.7"
          >
            {z.label}
          </text>
        </g>
      ))}
      {/* 锚点标记（太阳能路灯杆） */}
      <g transform={`translate(${ANCHOR_MARKER.x}, ${ANCHOR_MARKER.y})`}>
        <circle r="10" fill="#c8322b" stroke="#111111" strokeWidth="2" />
        <circle r="3" fill="#f4f4ee" />
      </g>
    </svg>
  );
}
