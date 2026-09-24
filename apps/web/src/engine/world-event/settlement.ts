import { ref, runTransaction } from "firebase/database";
import { db } from "../identity/firebase";
import type { RewardShare, WorldEventParticipation } from "./types";

// 奖金池按伤害排名比例分发（报告 L-3.0 / R8："奖金池总额固定，按伤害排名比例分发…
// 无保底"）。这里把"排名比例"实现为"伤害占全场总伤害的比例"——按伤害量占比连续分配，
// 而不是分成几个名次区间各拿一个固定份额。两种读法都能对上"排名比例"这四个字，
// 用哪一种是一处解读延伸，已记入 build-plan.md 供 Diasy 核对；连续按比例分配的好处是
// 不需要额外定义"第几名到第几名算一档"这套数值（§1.5 式的"数值待定"問題），先用这个
// 版本跑通结算流程。伤害为 0 的参与者不分钱，不做保底。
export function computeRewardShares(
  participations: Record<string, WorldEventParticipation>,
  rewardPoolTotal: number
): RewardShare[] {
  const entries = Object.entries(participations).map(([participantId, p]) => ({
    participantId,
    totalDamage: (p.damage_from_minigame ?? 0) + (p.damage_from_activity ?? 0),
  }));

  const totalDamage = entries.reduce((sum, e) => sum + e.totalDamage, 0);

  const ranked = [...entries].sort((a, b) => b.totalDamage - a.totalDamage);

  return ranked.map((e, index) => ({
    participantId: e.participantId,
    totalDamage: e.totalDamage,
    rank: index + 1,
    rewardAmount:
      totalDamage > 0 && e.totalDamage > 0
        ? Math.floor((e.totalDamage / totalDamage) * rewardPoolTotal)
        : 0,
  }));
}

// 结算奖励只能领一次——用 runTransaction 锁 reward_claimed，避免同一个人手滑点两次
// 领取按钮时被记两次。Credits 实际入账写进 workspaces/$workspace_id/credits_balance，
// 这个字段本来就是账号自己可写（阶段 0/1 就是这样，不是阶段 2 新放开的权限），
// 阶段 2 没有再单独加一层"只有服务端能发奖励"的校验——这属于沿用既有的信任边界，
// 不是新增的弱化，已记入 build-plan.md 的已知限制。
export async function claimReward(
  eventId: string,
  participantId: string,
  workspaceId: string,
  rewardAmount: number
): Promise<boolean> {
  if (rewardAmount <= 0) return false;

  const claimRef = ref(
    db,
    `world_event_participation/${eventId}/${participantId}/reward_claimed`
  );
  const claimResult = await runTransaction(claimRef, (current: boolean | null) => {
    if (current === true) return; // 已经领过，中止
    return true;
  });
  if (!claimResult.committed) return false;

  const balanceRef = ref(db, `workspaces/${workspaceId}/credits_balance`);
  await runTransaction(balanceRef, (current: number | null) => (current ?? 0) + rewardAmount);
  return true;
}
