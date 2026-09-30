import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
// REV 04（PWA 化，2026-09-30）：加 VitePWA 插件自动生成 manifest.json 和
// service worker，不手写这两样。图标仍是几何占位（public/icons/），
// 待 Diasy 提供真实美术资源后直接替换文件，不需要改这里的配置。
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "EchoCity",
        short_name: "EchoCity",
        description: "河岸产业园游戏化运营引擎 demo",
        start_url: "/",
        display: "standalone",
        background_color: "#f4f4ee",
        theme_color: "#1e2320",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // demo 阶段不需要精细的离线策略，用默认预缓存 + 运行时不额外配置，
        // 保证"添加到主屏幕"后能打开、支持基础离线访问即可。
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
    }),
  ],
});
