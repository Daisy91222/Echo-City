// 手动触发一次 Claude API，生成阶段 1 骨架需要的两类缓存内容：
//   1. 宠物状态句（3 品种 × 3 mood_tier = 9 条）—— §3.7 status_sentence
//   2. 一个锚点的"今日回响"（1 条）—— §3.7 anchor_daily_greeting
// 对应 build-plan §1「AI 调用」的架构：预生成 + 缓存，不在用户请求路径上现场调用。
// 真实产品里这是 Cloud Functions 的每日 scheduled function（阶段 2+ 才实现）；
// 骨架阶段用这个脚本手动跑一次，把生成结果写回 content-packs 里的静态 JSON，
// App 运行时只读缓存，不直接依赖这个脚本或 API key。
//
// 用法：ANTHROPIC_API_KEY=sk-ant-xxx node scripts/generate-content.mjs

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentPacksDir = resolve(__dirname, "../../../content-packs/riverside-yard");

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error(
    "缺少 ANTHROPIC_API_KEY 环境变量。请先设置后再运行:\n" +
      "  ANTHROPIC_API_KEY=sk-ant-xxx node scripts/generate-content.mjs"
  );
  process.exit(1);
}

const client = new Anthropic({ apiKey });

const SPECIES = ["mochi", "brick", "sprout"];
const MOOD_TIERS = ["low", "mid", "high"];

const anchorsPath = resolve(contentPacksDir, "anchors.json");
const sentencesPath = resolve(contentPacksDir, "pet-status-sentences.json");

async function generatePetSentences() {
  const result = {};
  for (const species of SPECIES) {
    result[species] = {};
    for (const tier of MOOD_TIERS) {
      // 输入按 §3.7 定义：{ pet_species, workspace_today_data, collection_progress, hours_since_fed }
      // 骨架阶段用固定的示例输入，不接每个真实用户的实时数据（那是阶段 2+ 才有意义的事）
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 60,
        messages: [
          {
            role: "user",
            content:
              `You are writing a one-sentence first-person status line for a small pixel-art companion ` +
              `pet named after the species "${species}" living in an industrial-heritage riverside park. ` +
              `Its current mood tier is "${tier}" (low/mid/high), based on today's park activity data ` +
              `(a solar lamp post generated some kWh today) and how long since it was last fed. ` +
              `Write ONE short, warm, first-person sentence (under 18 words), no quotes, no emoji.`,
          },
        ],
      });
      const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "...";
      result[species][tier] = text;
      console.log(`  ${species}/${tier}: ${text}`);
    }
  }
  return result;
}

async function generateDailyGreeting(anchors) {
  const anchor = anchors["a1-solar-pole"];
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 60,
    messages: [
      {
        role: "user",
        content:
          `Write ONE short first-person "today's echo" opening line (under 20 words, no quotes) spoken by ` +
          `a solar-powered lamp post in an industrial-heritage riverside park. Today it generated ` +
          `${anchor.simulated_data.kwh_today} kWh with ${anchor.simulated_data.uptime_pct}% uptime. ` +
          `Warm, reflective tone, ties today's number to the park's history without over-explaining.`,
      },
    ],
  });
  return msg.content[0]?.type === "text" ? msg.content[0].text.trim() : null;
}

console.log("Generating pet status sentences...");
const sentences = await generatePetSentences();
writeFileSync(sentencesPath, JSON.stringify(sentences, null, 2) + "\n");
console.log(`written: ${sentencesPath}`);

console.log("Generating anchor daily greeting...");
const anchors = JSON.parse(readFileSync(anchorsPath, "utf-8"));
const greeting = await generateDailyGreeting(anchors);
anchors["a1-solar-pole"].daily_greeting_text = greeting;
anchors["a1-solar-pole"].daily_greeting_generated_at = Date.now();
writeFileSync(anchorsPath, JSON.stringify(anchors, null, 2) + "\n");
console.log(`written: ${anchorsPath}`);
console.log(`  greeting: ${greeting}`);
