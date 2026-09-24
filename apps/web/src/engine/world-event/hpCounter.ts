import { get, ref, runTransaction, set } from "firebase/database";
import { db } from "../identity/firebase";
import type { WorldEvent } from "./types";

// 单次伤害上限，和 database.rules.json 里 boss_hp_remaining / damage_from_minigame /
// damage_from_activity 的 .validate 规则里的上限保持一致——客户端和规则各自独立
// 校验同一个数字，任何一边改了都要同步改另一边（rules 不支持引用这个常量）。
export const MAX_DAMAGE_PER_SUBMIT = 60;

// demo 占位数值：boss_hp_total / reward_pool_total 不是"数值待定"对话定的最终额度，
// 是为了让一次几分钟的现场演示能打完全程而选的演示规模数字，见 build-plan §3 阶段 2 行。
const DEMO_BOSS_HP_TOTAL = 600;
const DEMO_REWARD_POOL_TOTAL = 500;
const TWO_DAYS_MS = 2 * 24 * 3600 * 1000;

// 阶段 2 只维护一个进行中的世界事件（对应 R8"每月一次"的骨架版：demo 阶段不需要
// 排期多场，跑通一场的全链路即可）。event_id 按 content_pack 固定，重复调用
// ensureWorldEvent 不会重复建事件。
export function activeEventId(contentPackId: string): string {
  return `we-${contentPackId}-demo01`;
}

// 事件不存在时创建一份（database.rules.json 允许 !data.exists() 时任何登录用户创建，
// 之后这些配置字段（除 boss_hp_remaining/version/settled 外）就再也改不了，
// 对应"世界事件排期与奖金池只有平台维护团队能改"——demo 阶段没有单独建平台维护团队账号，
// 所以只在事件第一次被创建时写一次这些值，写完即锁死，不是真的绕开了这条权限原则，
// 只是把"谁来点第一次创建"这件事简化成了"谁先打开这个页面"。
export async function ensureWorldEvent(
  contentPackId: string,
  landmarkAnchorId: string
): Promise<WorldEvent> {
  const eventId = activeEventId(contentPackId);
  const eventRef = ref(db, `world_events/${eventId}`);
  const snap = await get(eventRef);
  if (snap.exists()) return snap.val() as WorldEvent;

  const now = Date.now();
  const event: WorldEvent = {
    event_id: eventId,
    content_pack_id: contentPackId,
    starts_at: now,
    ends_at: now + TWO_DAYS_MS,
    landmark_anchor_id: landmarkAnchorId,
    boss_hp_total: DEMO_BOSS_HP_TOTAL,
    boss_hp_remaining: DEMO_BOSS_HP_TOTAL,
    version: 0,
    settled: false,
    reward_pool_total: DEMO_REWARD_POOL_TOTAL,
  };
  await set(eventRef, event);
  return event;
}

export interface DamageResult {
  applied: boolean;
  newHp: number;
  justSettled: boolean;
}

// 提交一次伤害，原子递减 boss_hp_remaining——这是把阶段 1 已经在模拟环境里验证过的
// HP spike 算法（乐观并发 CAS + 重试，见 claude/echocity-prototype.md §5 第 4 项）
// 第一次搬到真实 Firebase 项目上复测（build-plan §3 阶段 2 DoD 明确要求这一步）。
// runTransaction 内部就是"读取当前值→本地计算新值→带版本校验写回，冲突自动重试"，
// 和 spike 里手写的 CAS 循环是同一套思路，只是换成 Firebase 提供的原生实现。
export async function submitDamageToBoss(
  eventId: string,
  amount: number
): Promise<DamageResult> {
  const clamped = Math.max(0, Math.min(Math.floor(amount), MAX_DAMAGE_PER_SUBMIT));
  const eventRef = ref(db, `world_events/${eventId}`);

  const result = await runTransaction(eventRef, (current: WorldEvent | null) => {
    if (!current) return current; // 事件不存在，中止
    if (current.settled) return; // 已结算——返回 undefined 中止事务，不再扣血
    if (clamped <= 0) return current; // 没有实际伤害，原样返回，不产生一次空提交

    const nextHp = Math.max(0, current.boss_hp_remaining - clamped);
    const nowSettled = nextHp <= 0 || Date.now() >= current.ends_at;

    return {
      ...current,
      boss_hp_remaining: nextHp,
      version: current.version + 1,
      settled: nowSettled,
    };
  });

  if (result.committed && result.snapshot.exists()) {
    const data = result.snapshot.val() as WorldEvent;
    return { applied: true, newHp: data.boss_hp_remaining, justSettled: data.settled };
  }
  return { applied: false, newHp: 0, justSettled: false };
}
