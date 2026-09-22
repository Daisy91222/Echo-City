# scripts/generate-content.mjs

手动触发一次 Claude API，生成阶段 1 骨架需要的宠物状态句 + 今日回响，写回
`content-packs/riverside-yard/` 下的静态 JSON（不是运行时现场调用）。

运行前需要一个 Anthropic API key：

```
ANTHROPIC_API_KEY=sk-ant-xxx node scripts/generate-content.mjs
```

当前仓库里 `pet-status-sentences.json` / `anchors.json.daily_greeting_text`
还是占位文本（`_meta.generated: false`），因为写这份骨架代码时沙盒里没有
可用的 API key。这一步需要 Diasy 提供 key 后手动跑一次。
