# EchoCity · apps/web

阶段 1（步进骨架）产出。对应 `claude/echocity-build-plan.md` §3 阶段 1 行的 DoD：
网页主界面 + 一个锚点（太阳能杆）+ 模拟数据 + AI 宠物句 + 宠物状态最简展示，
链路为登录 → 选工作区 → 主界面看宠物状态 → 扫锚点看详情。

## 运行

```bash
cd apps/web
npm install
npm run dev
```

打开 http://localhost:5173 ，注册一个账号（随便填邮箱，选一只宠物），
会依次创建 Firebase 里的 `pets/`、`workspaces/`、`accounts/` 三个节点
（真实写入，不是模拟——这就是阶段 0 挪后的"读写测试数据"验收）。

## 尚待完成的两件事（诚实标注，不算已完成）

1. **AI 生成内容还是占位文本**：`content-packs/riverside-yard/pet-status-sentences.json`
   和 `anchors.json` 里的 `daily_greeting_text` 目前是占位——写这份骨架代码时，
   我这边的执行环境没有可用的 `ANTHROPIC_API_KEY`。需要 Diasy 提供一个 key，
   然后跑一次：
   ```bash
   ANTHROPIC_API_KEY=sk-ant-xxx npm run generate:content
   ```
   见 `scripts/README.md`。

2. **我这边没能亲自点通这条链路**：我的沙盒执行环境访问 `firebaseio.com`
   被组织级网络白名单挡住（阶段 0 已经记录过这个限制），`npm run dev`
   跑起来的开发服务器我这边也没法在真实浏览器里点。这部分需要 Diasy
   在自己电脑上跑起来、亲自点一遍登录→选工作区→主界面→扫锚点这条链路，
   确认 Firebase Auth 和 Realtime Database 真的读写成功，我再据此打 tag。

## 目录说明

见仓库根目录 `claude/echocity-build-plan.md` §2（目录结构），这里的
`src/engine/*` 对应引擎（纯逻辑）、`src/screens/*` 对应 Figma 屏幕、
`src/content-loader` 负责按 content_pack_id 拉取 `../../content-packs/`
下的静态内容包数据。
