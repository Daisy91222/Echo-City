import { get, ref, runTransaction, set } from "firebase/database";
import { db } from "../identity/firebase";
import { MAX_DAMAGE_PER_SUBMIT, submitDamageToBoss } from "./hpCounter";
import type { WorldEventParticipation } from "./types";

// 每 6 小时才能结算一次自己的活跃度伤害——对应 §3.6 damage_from_activity"活跃度每
// 6 小时折算一次"。阶段 2 简化：原设计是后台 cron（Admin SDK）统一给所有参与者结算，
// 现在改成"每个参与者自己打开世界事件页面时，如果距上次自己结算过了 6 小时，就顺便
// 结一次自己的"——避免需要一个能替别人写数据的服务端角色，这一处简化已记入 build-plan.md。
export const ACTIVITY_SETTLEMENT_INTERVAL_MS = 6 * 3600 * 1000;
// 每次活跃度换算的伤害上限，同样要和 database.rules.json 里 damage_from_activity
// 的单次涨幅上限保持一致
export const MAX_ACTIVITY_DAMAGE_PER_SETTLEMENT = 40;
// 活跃度换算伤害的系数：demo 占位比例（活跃度点数 / 该系数 = 伤害），不是最终数值
const ACTIVITY_TO_DAMAGE_DIVISOR = 5;

function participationPath(eventId: string, participantId: string) {
  return `world_event_participation/${eventId}/${participantId}`;
}

export async function joinWorldEvent(
  eventId: string,
  participantId: string,
  currentActivityScore: number
): Promise<WorldEventParticipation> {
  const path = participationPath(eventId, participantId);
  const snap = await get(ref(db, path));
  if (snap.exists()) return snap.val() as WorldEventParticipation;

  const participation: WorldEventParticipation = {
    joined_at: Date.now(),
    eligible_to_attack: false,
    damage_from_minigame: 0,
    damage_from_activity: 0,
    last_activity_settlement_at: Date.now(),
    activity_score_at_last_settlement: currentActivityScore,
  };
  await set(ref(db, path), participation);
  return participation;
}

// 模拟定位开关——demo 阶段代替真实地理围栏 + 罗盘校验（build-plan §3 阶段 2 行）。
// 只是 UI 状态的持久化，不代表服务端信任这个值本身（这是阶段 2 一处已记录的信任边界，
// 见 journal.md：去掉 Cloud Function 之后，没有服务端再校验位置/朝向，demo 阶段接受
// 这个简化）。
export async function setEligibleToAttack(
  eventId: string,
  participantId: string,
  eligible: boolean
) {
  await set(ref(db, `${participationPath(eventId, participantId)}/eligible_to_attack`), eligible);
}

export interface MinigameSubmitResult {
  hpApplied: boolean;
  newHp: number;
  justSettled: boolean;
}

// 小游戏一局结束后调用：先原子累加自己的 damage_from_minigame（供排行榜/结算用），
// 再原子递减共享血条。这是两次独立事务，不是跨路径的单次原子写——RTDB 客户端 SDK
// 没有"多路径一起原子提交"的能力（Admin SDK 才有），两步之间如果中途掉线，
// 血条和个人战报可能短暂不一致；对 demo 规模可接受，已记入 build-plan.md 的已知限制。
export async function submitMinigameDamage(
  eventId: string,
  participantId: string,
  rawDamage: number
): Promise<MinigameSubmitResult> {
  const clamped = Math.max(0, Math.min(Math.floor(rawDamage), MAX_DAMAGE_PER_SUBMIT));
  if (clamped <= 0) return { hpApplied: false, newHp: 0, justSettled: false };

  const damageRef = ref(db, `${participationPath(eventId, participantId)}/damage_from_minigame`);
  await runTransaction(damageRef, (current: number | null) => (current ?? 0) + clamped);

  const hpResult = await submitDamageToBoss(eventId, clamped);
  return { hpApplied: hpResult.applied, newHp: hpResult.newHp, justSettled: hpResult.justSettled };
}

export interface ActivitySettlementResult {
  settled: boolean;
  damageDealt: number;
  reason?: "not_due_yet" | "not_eligible" | "no_activity";
}

// 把"距上次自己结算过了多久"和"这段时间自己的活跃度涨了多少"转成一次伤害提交。
// currentActivityScore 由调用方传入（来自 useAccount 已经在读的 account.activity_score），
// 这里不重复订阅一次账号数据。
export async function settleOwnActivityDamage(
  eventId: string,
  participantId: string,
  currentActivityScore: number
): Promise<ActivitySettlementResult> {
  const path = participationPath(eventId, participantId);
  const snap = await get(ref(db, path));
  if (!snap.exists()) return { settled: false, damageDealt: 0, reason: "not_eligible" };
  const participation = snap.val() as WorldEventParticipation;

  const dueAt = participation.last_activity_settlement_at + ACTIVITY_SETTLEMENT_INTERVAL_MS;
  if (Date.now() < dueAt) return { settled: false, damageDealt: 0, reason: "not_due_yet" };

  const baseline = participation.activity_score_at_last_settlement ?? currentActivityScore;
  const activityDelta = Math.max(0, currentActivityScore - baseline);
  if (activityDelta <= 0) {
    // 没有新增活跃度也要把结算时间和快照往前推，避免"活跃度没涨也一直卡在到期状态"反复重试
    await set(ref(db, `${path}/last_activity_settlement_at`), Date.now());
    await set(ref(db, `${path}/activity_score_at_last_settlement`), currentActivityScore);
    return { settled: false, damageDealt: 0, reason: "no_activity" };
  }

  const damage = Math.min(
    Math.floor(activityDelta / ACTIVITY_TO_DAMAGE_DIVISOR),
    MAX_ACTIVITY_DAMAGE_PER_SETTLEMENT
  );

  const damageRef = ref(db, `${path}/damage_from_activity`);
  await runTransaction(damageRef, (current: number | null) => (current ?? 0) + damage);
  await set(ref(db, `${path}/last_activity_settlement_at`), Date.now());
  await set(ref(db, `${path}/activity_score_at_last_settlement`), currentActivityScore);

  if (damage > 0) await submitDamageToBoss(eventId, damage);
  return { settled: true, damageDealt: damage };
}
