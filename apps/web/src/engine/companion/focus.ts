import { ref, runTransaction } from "firebase/database";
import { db } from "../identity/firebase";

// 阶段 4（陪伴细化）— 对应 R7 / D1 屏幕："番茄钟 = 工作者桌面专注计时，
// 完成加活跃度"，§1.5"专注计时完成…计入活跃度"。
// 数值待定：真实产品里这大概率就是标准的 25 分钟番茄钟；但 demo 阶段为了让
// Diasy 能在一次测试里实际验证"倒计时走完 → activity_score 真的加了"这条链路，
// 这里故意把时长设得很短（不是 bug，是刻意的demo简化，做法上和阶段 2 世界事件
// 小游戏回合缩短到 20 秒同一个思路），量产阶段把这一个常量改回 25 分钟即可，
// 不需要改 D1.tsx 或 completeFocusSession 的任何逻辑。
export const FOCUS_SESSION_SECONDS = 120;
export const ACTIVITY_PER_FOCUS_SESSION = 10;

export async function completeFocusSession(accountId: string): Promise<void> {
  const activityRef = ref(db, `accounts/${accountId}/activity_score`);
  await runTransaction(activityRef, (current: number | null) => (current ?? 0) + ACTIVITY_PER_FOCUS_SESSION);
}
