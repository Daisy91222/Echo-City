/** @type {import('tailwindcss').Config} */
// 颜色/间距/圆角/字体全部照抄 Figma EchoCity 变量集（01 Foundations 页），
// 通过 Figma MCP get_variable_defs 读取自 Style Tile / Text Field / S1 等节点，
// 不是凭空定义 —— 保证 Figma 和代码用同一套 token（build-plan §1 技术选型的要求）。
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          base: "#f4f4ee",
          raised: "#e6e1d7",
          line: "#bebbad",
        },
        ink: {
          soft: "#777777",
          base: "#333333",
          strong: "#111111",
        },
        accent: {
          red: "#c8322b",
          orange: "#e8873a",
          sand: "#f0d9a6",
        },
        zone: {
          eco: "#6e8f72",
          exhibit: "#a5738c",
          community: "#b8893f",
        },
      },
      spacing: {
        // space/8, space/12, space/16 来自 Figma；其余按 Tailwind 默认比例补全，
        // 不是 Figma 变量，用到再核对。
        fig8: "8px",
        fig12: "12px",
        fig16: "16px",
      },
      borderRadius: {
        md: "8px", // radius/md
        lg: "16px", // radius/lg
      },
      fontFamily: {
        pixel: ['"Pixelify Sans"', "sans-serif"],
      },
      boxShadow: {
        // Figma「阴影二分」：硬边 3px 无模糊
        hard: "3px 3px 0 0 #111111",
      },
    },
  },
  plugins: [],
};
