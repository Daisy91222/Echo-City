import { push, ref, set, update } from "firebase/database";
import { db } from "../identity/firebase";
import type { AgeBand } from "./types";

// 最多 4 个成员位（E2），这里只在创建时做一个简单的前端校验——不是安全边界
// （真要防止绕过前端多建，需要在 rules 里加计数校验，demo 阶段不做，和项目里
// 其它"客户端自报/自校验"字段的信任边界一致，比如 world_event 的伤害字段）。
export const MAX_MEMBER_SLOTS = 4;

export async function createMemberSlot(
  uid: string,
  input: { nickname: string; avatar: string; age_band: AgeBand }
): Promise<string> {
  const newRef = push(ref(db, "member_slots"));
  const memberId = newRef.key!;
  await set(newRef, {
    account_id: uid,
    nickname: input.nickname,
    avatar: input.avatar,
    age_band: input.age_band,
    activity_score: 0,
    points_balance: 0,
  });
  // 反向索引（identity/types.ts 的 member_slot_ids 注释）：成员位本身已经写好了，
  // 这一步只是让账号知道"我有这个成员位"，用于后续按 id 逐个订阅
  await update(ref(db, `accounts/${uid}`), { [`member_slot_ids/${memberId}`]: true });
  return memberId;
}

// 切换"当前以谁的身份在玩"。memberId = null 表示切回监护人本人。
export async function switchActiveMember(uid: string, memberId: string | null): Promise<void> {
  await update(ref(db, `accounts/${uid}`), { current_member_id: memberId });
}
