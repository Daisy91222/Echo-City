import { onValue, ref, runTransaction } from "firebase/database";
import { useEffect, useState } from "react";
import { db } from "../identity/firebase";
import type { KidTaskCompletion } from "./types";

// 对应 D3："儿童任务卡：家长手动确认，不产出 Credits，产出成员位自己的 Points + 活跃度"。
// §3.9 原字段表把"完成"(completed_at)和"家长确认"(guardian_confirmed_at)设计成
// 两步，但落地时发现孩子在这个 demo 里不单独持有设备/账号（L-4.0），"发卡 →
// 手机收起 → 家长确认"这条真实流程里，掏出手机操作的始终是监护人本人——
// 所以这里把两步合并成一次写入，由监护人在成员位视角点一次"Confirm completed"
// 就同时写两个时间戳，而不是在 UI 上模拟一个孩子单独操作的假动作。
export async function completeTaskCard(
  memberId: string,
  card: { card_id: string; points_reward: number; activity_reward: number }
): Promise<"ok" | "already_completed"> {
  const now = Date.now();
  const completionRef = ref(db, `kid_task_completions/${memberId}/${card.card_id}`);
  const result = await runTransaction(completionRef, (current: KidTaskCompletion | null) => {
    if (current) return; // abort：已经完成过这张卡，不重复发奖励
    return { card_id: card.card_id, completed_at: now, guardian_confirmed_at: now };
  });
  if (!result.committed) return "already_completed";

  if (card.points_reward > 0) {
    await runTransaction(
      ref(db, `member_slots/${memberId}/points_balance`),
      (current: number | null) => (current ?? 0) + card.points_reward
    );
  }
  if (card.activity_reward > 0) {
    await runTransaction(
      ref(db, `member_slots/${memberId}/activity_score`),
      (current: number | null) => (current ?? 0) + card.activity_reward
    );
  }
  return "ok";
}

export function useKidTaskCompletions(memberId: string | null | undefined) {
  const [completions, setCompletions] = useState<Record<string, KidTaskCompletion>>({});
  const [loading, setLoading] = useState(!!memberId);

  useEffect(() => {
    if (!memberId) {
      setCompletions({});
      setLoading(false);
      return;
    }
    setLoading(true);
    return onValue(ref(db, `kid_task_completions/${memberId}`), (snap) => {
      setCompletions(snap.exists() ? (snap.val() as Record<string, KidTaskCompletion>) : {});
      setLoading(false);
    });
  }, [memberId]);

  return { completions, loading };
}
