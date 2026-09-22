import type { MoodTier } from "./types";

// mood_tier = f(当前工作区园区实时数据, 收集记录, 距上次投喂间隔) —— §3.3 定义了字段
// 和输入，明确说"具体系数是 W2 骨架任务之一，这里只定字段不定公式"。
// 这是骨架阶段给出的第一版最简系数，不是最终数值，后续阶段可以直接替换这个函数体，
// 不影响调用方（S1 主界面）的接口。
export interface MoodTierInput {
  todayKwh: number; // 当前工作区今日的锚点数据汇总（骨架阶段只有一个锚点，直接用它）
  collectionCount: number; // 收集记录条数
  hoursSinceFed: number;
}

export function computeMoodTier({
  todayKwh,
  collectionCount,
  hoursSinceFed,
}: MoodTierInput): MoodTier {
  if (hoursSinceFed > 48) return "low";

  const score = todayKwh * 2 + collectionCount * 5 - hoursSinceFed;
  if (score >= 8) return "high";
  if (score >= 0) return "mid";
  return "low";
}
