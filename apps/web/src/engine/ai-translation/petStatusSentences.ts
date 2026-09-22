import sentencesData from "../../../../../content-packs/riverside-yard/pet-status-sentences.json";
import type { MoodTier, PetSpecies } from "../companion/types";
import type { PetStatusSentences } from "./types";

// F5 缓存基线：文案在 pet-status-sentences.json 里是"凌晨预生成"的结果
// （demo 阶段用 scripts/generate-pet-sentences.mjs 手动触发一次，见该脚本注释），
// App 运行时只按 mood_tier 挑一条展示，不现场调用 Claude API。
const sentences = sentencesData as unknown as PetStatusSentences;

export function pickPetStatusSentence(
  species: PetSpecies,
  moodTier: MoodTier
): string {
  return sentences[species]?.[moodTier] ?? "...";
}
