import { ref, runTransaction } from "firebase/database";
import { db } from "../identity/firebase";
import type { Anchor, StoryChapter } from "../ai-translation/types";

// 章节解锁判断抽成一个共享函数——之前 A2AnchorDetail 里直接写了一遍这个比较，
// C1 图鉴页也需要同样的判断，抽出来避免同一段逻辑在两个屏幕里各写一遍
// （karpathy-guidelines：不重复实现同一段业务逻辑）。
export function isChapterUnlocked(anchor: Anchor, chapter: StoryChapter): boolean {
  const currentValue = anchor.simulated_data[chapter.unlock_field] ?? 0;
  return currentValue >= chapter.unlock_threshold;
}

export function allChaptersSorted(anchors: Anchor[]): { anchor: Anchor; chapter: StoryChapter }[] {
  return anchors
    .flatMap((anchor) => anchor.story_chapters.map((chapter) => ({ anchor, chapter })))
    .sort((a, b) => a.chapter.order_index - b.chapter.order_index);
}

// 数值待定（§1.5"待定 1–6"同类问题）：每收集一章给多少 Points 还没有和 Diasy
// 定过具体数字，这里先用一个占位值把"收集品同时给 Points"（§3.1）这条机制跑通，
// 等 Diasy 给真实数值时只需要改这一个常量。
const POINTS_PER_CHAPTER_COLLECTED = 5;

// 用 runTransaction 锁 collection_progress/unlocked_chapter_ids/{chapter_id}，
// 保证同一章节的 Points 奖励只会被记一次——即使玩家反复打开同一个锚点详情页
// （每次打开都会尝试 claim 已解锁的章节），也不会重复加 Points。这是复用阶段 2
// settlement.ts claimReward() 里验证过的"事务守卫，已发放则中止"这个模式，
// 不是本次新发明的写法。
export async function claimChapterCollectible(
  workspaceId: string,
  chapterId: string
): Promise<boolean> {
  const claimRef = ref(db, `workspaces/${workspaceId}/collection_progress/unlocked_chapter_ids/${chapterId}`);
  const claimResult = await runTransaction(claimRef, (current: true | null) => {
    if (current === true) return; // 已经收集过，中止，不重复发 Points
    return true;
  });
  if (!claimResult.committed) return false;

  const pointsRef = ref(db, `workspaces/${workspaceId}/points_balance`);
  await runTransaction(pointsRef, (current: number | null) => (current ?? 0) + POINTS_PER_CHAPTER_COLLECTED);
  return true;
}

export { POINTS_PER_CHAPTER_COLLECTED };
