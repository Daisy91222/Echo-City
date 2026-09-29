import riversideSentences from "../../../../../content-packs/riverside-yard/pet-status-sentences.json";
import theRoomSentences from "../../../../../content-packs/the-room/pet-status-sentences.json";
import type { MoodTier, PetSpecies } from "../companion/types";
import type { PetStatusSentences } from "./types";

// F5 缓存基线：文案在 pet-status-sentences.json 里是"凌晨预生成"的结果
// （demo 阶段用 scripts/generate-content.mjs 手动触发一次，见该脚本注释），
// App 运行时只按 mood_tier 挑一条展示，不现场调用 Claude API。
//
// 阶段 5 修复：这个文件此前无条件读 riverside-yard 一份文案，是骨架阶段"只有
// 一个内容包"时期留下的写法。§3.7 的设计本意是 pet_status_sentence 的输入包含
// workspace_today_data（随内容包变化），文案本该按内容包分开——阶段 5 引入
// the-room 后这个缺口第一次会被真正踩到（否则 the-room 工作区会显示"河边的光"
// 这类文不对题的 riverside-yard 语句）。这里补上按 content_pack_id 选文案集的
// 逻辑；the-room 的 9 条文案目前是手写占位文本（未经 Claude API 生成，因为这个
// 沙盒连不上 api.anthropic.com，这条网络限制从阶段 1 起就一直存在），等 Diasy
// 有空可以用 generate-content.mjs 脚本重新生成一版真实内容替换。
const sentenceSetsByPack: Record<string, PetStatusSentences> = {
  "riverside-yard": riversideSentences as unknown as PetStatusSentences,
  "the-room": theRoomSentences as unknown as PetStatusSentences,
};

export function pickPetStatusSentence(
  species: PetSpecies,
  moodTier: MoodTier,
  contentPackId: string = "riverside-yard"
): string {
  const sentences = sentenceSetsByPack[contentPackId] ?? sentenceSetsByPack["riverside-yard"];
  return sentences[species]?.[moodTier] ?? "...";
}
